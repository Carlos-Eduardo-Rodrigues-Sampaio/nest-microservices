import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom, timeout } from 'rxjs';

import { PrismaService } from './prisma.service';

/**
 * Lê eventos pendentes da tabela OutboxEvent e os publica no RabbitMQ.
 *
 * Garantia: at-least-once. Se o processo cair entre a publicação e o update de
 * publishedAt, o evento será publicado novamente — por isso o consumidor
 * (Notifications) é idempotente via eventId.
 *
 * Limitação (versão didática): com várias instâncias de Orders, mais de uma
 * pode ler o mesmo evento pendente. Para produção, use claim/lease ou
 * `SELECT ... FOR UPDATE SKIP LOCKED`.
 */
@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  constructor(
    private readonly prisma: PrismaService,

    @Inject('NOTIFICATIONS_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  @Cron('*/5 * * * * *', { waitForCompletion: true })
  async publishPendingEvents() {
    const events = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    for (const event of events) {
      try {
        const record = new RmqRecordBuilder(event.payload)
          .setOptions({ persistent: true, messageId: event.id })
          .build();

        // timeout: o cliente RMQ aguarda a conexão indefinidamente se o broker estiver fora
        await firstValueFrom(
          this.client.emit(event.eventType, record).pipe(timeout(5000)),
        );

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });

        this.logger.log(`Evento ${event.id} publicado`);
      } catch (error) {
        this.logger.error(
          `Erro ao publicar evento ${event.id}: ${(error as Error)?.message ?? error}`,
        );
        // Preserva a ordem: não publica eventos mais novos antes do que falhou
        break;
      }
    }
  }
}
