// Declara a topologia do RabbitMQ (DLX + DLQ + fila principal com dead-letter).
// Uso: npm run rabbit:setup
// Mantenha em sincronia com libs/contracts/src/rabbitmq.ts.
const amqp = require('amqplib');

async function setup() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange('notifications.dlx', 'direct', { durable: true });

  await channel.assertQueue('notifications_dlq', { durable: true });

  await channel.bindQueue(
    'notifications_dlq',
    'notifications.dlx',
    'notifications.failed',
  );

  await channel.assertQueue('notifications_queue', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'notifications.dlx',
      'x-dead-letter-routing-key': 'notifications.failed',
    },
  });

  console.log('Filas configuradas');

  await channel.close();
  await connection.close();
}

setup().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
