export interface OrderCreatedEvent {
  /** Identifica o acontecimento (não a tentativa de entrega). Reentregas mantêm o mesmo eventId. */
  eventId: string;
  orderId: number;
  userId: number;
  total: string;
  occurredAt: string;
}

export const ORDER_CREATED = 'order.created';
