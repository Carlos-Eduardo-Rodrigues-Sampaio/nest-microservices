import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ORDER_CREATED, OrderCreatedEvent } from '@app/contracts';

import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern(ORDER_CREATED)
  async handleOrderCreated(
    @Payload() data: OrderCreatedEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      await this.notificationsService.processOrderCreated(data);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Falha ao processar evento ${data?.eventId}: ${(error as Error)?.message}`,
      );
      // Sem requeue: a mensagem vai para a DLQ (notifications_dlq) via dead-letter exchange.
      channel.nack(message, false, false);
    }
  }
}
