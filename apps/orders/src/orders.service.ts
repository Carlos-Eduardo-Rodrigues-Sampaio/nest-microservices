import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  CreateOrderDto,
  ORDER_CREATED,
  OrderCreatedEvent,
  rpcError,
} from '@app/contracts';

import { PrismaService } from './prisma.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,

    @Inject('USERS_SERVICE')
    private readonly usersClient: ClientProxy,
  ) {}

  async create(data: CreateOrderDto) {
    // 1. Consulta o microserviço de usuários (síncrono, via TCP)
    await this.assertUserExists(data.userId);

    // 2. Pedido + evento pendente na MESMA transação (Transactional Outbox).
    //    A publicação no RabbitMQ é feita depois pelo OutboxPublisher.
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: data.userId,
          description: data.description,
          total: data.total,
        },
      });

      const event: OrderCreatedEvent = {
        eventId: randomUUID(),
        orderId: order.id,
        userId: order.userId,
        total: order.total.toString(),
        occurredAt: new Date().toISOString(),
      };

      await tx.outboxEvent.create({
        data: {
          id: event.eventId,
          eventType: ORDER_CREATED,
          payload: { ...event },
        },
      });

      return order;
    });
  }

  findAll() {
    return this.prisma.order.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw rpcError(404, 'Pedido não encontrado', 'Not Found');
    }

    return order;
  }

  /**
   * O Users Service responde com erro (RpcException 404) quando o usuário não
   * existe — ele NÃO devolve null/undefined. Por isso o erro é tratado aqui,
   * junto com timeout e indisponibilidade do serviço.
   */
  private async assertUserExists(userId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.usersClient.send('users.findOne', userId).pipe(timeout(3000)),
      );
    } catch (error) {
      const err = error as { statusCode?: number; name?: string; code?: string };

      if (err?.statusCode === 404) {
        throw rpcError(400, 'Usuário inválido', 'Bad Request');
      }

      this.logger.error(
        `Falha ao consultar Users Service: ${err?.name ?? err?.code ?? JSON.stringify(error)}`,
      );
      throw rpcError(
        503,
        'Serviço de usuários indisponível ou sem resposta',
        'Service Unavailable',
      );
    }
  }
}
