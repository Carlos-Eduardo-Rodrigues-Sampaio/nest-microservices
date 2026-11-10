import * as amqp from 'amqplib';

export const NOTIFICATIONS_QUEUE = 'notifications_queue';
export const NOTIFICATIONS_DLQ = 'notifications_dlq';
export const NOTIFICATIONS_DLX = 'notifications.dlx';
export const NOTIFICATIONS_DLX_ROUTING_KEY = 'notifications.failed';

/**
 * Opções da fila principal. O consumidor (Notifications) e o produtor (Orders)
 * PRECISAM usar exatamente os mesmos argumentos: o RabbitMQ rejeita a declaração
 * de uma fila existente com argumentos diferentes (PRECONDITION_FAILED).
 */
export const notificationsQueueOptions = {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': NOTIFICATIONS_DLX,
    'x-dead-letter-routing-key': NOTIFICATIONS_DLX_ROUTING_KEY,
  },
};

/**
 * Declara (de forma idempotente) a topologia: DLX, DLQ, binding e fila principal.
 * Mantenha em sincronia com scripts/setup-rabbitmq.cjs.
 */
export async function setupNotificationsTopology(url: string): Promise<void> {
  const connection = await amqp.connect(url);
  try {
    const channel = await connection.createChannel();

    await channel.assertExchange(NOTIFICATIONS_DLX, 'direct', { durable: true });
    await channel.assertQueue(NOTIFICATIONS_DLQ, { durable: true });
    await channel.bindQueue(
      NOTIFICATIONS_DLQ,
      NOTIFICATIONS_DLX,
      NOTIFICATIONS_DLX_ROUTING_KEY,
    );
    await channel.assertQueue(NOTIFICATIONS_QUEUE, notificationsQueueOptions);

    await channel.close();
  } finally {
    await connection.close();
  }
}
