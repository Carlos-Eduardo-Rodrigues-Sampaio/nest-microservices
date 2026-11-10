import { Injectable, Logger } from '@nestjs/common';
import { OrderCreatedEvent } from '@app/contracts';

import { PrismaService } from './prisma.service';

export type ProcessResult = 'processed' | 'duplicate';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Processamento idempotente de order.created.
   *
   * O registro em ProcessedEvent (chave primária = eventId) e o efeito de negócio
   * rodam na mesma transação: se o envio falhar, o registro é revertido e a
   * mensagem pode ser reprocessada; se o evento já foi processado, a restrição
   * de unicidade (P2002) impede o efeito duplicado, inclusive sob concorrência.
   */
  async processOrderCreated(event: OrderCreatedEvent): Promise<ProcessResult> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.processedEvent.create({ data: { eventId: event.eventId } });
        await this.sendOrderNotification(event);
      });
      return 'processed';
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        this.logger.warn(`Evento ${event.eventId} já processado — ignorando duplicata`);
        return 'duplicate';
      }
      throw error;
    }
  }

  async sendOrderNotification(data: Pick<OrderCreatedEvent, 'orderId' | 'userId' | 'total'>) {
    // Gancho de demonstração da DLQ (ver .env: NOTIFICATIONS_SIMULATE_FAILURE_TOTAL)
    const failTotal = process.env.NOTIFICATIONS_SIMULATE_FAILURE_TOTAL;
    if (failTotal && Number(data.total) === Number(failTotal)) {
      throw new Error('Falha simulada');
    }

    this.logger.log(`Notificação do pedido ${data.orderId}`);
    this.logger.log(`Usuário: ${data.userId}`);
    this.logger.log(`Total: R$ ${data.total}`);

    // Futuramente: await this.emailService.send(...);

    return { success: true };
  }
}
