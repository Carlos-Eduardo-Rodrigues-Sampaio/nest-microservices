import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import {
  NOTIFICATIONS_QUEUE,
  notificationsQueueOptions,
  setupNotificationsTopology,
} from '@app/contracts';

import { NotificationsModule } from './notifications.module';

async function bootstrap() {
  const url = process.env.RABBITMQ_URL!;

  // Garante DLX + DLQ + fila principal antes de consumir (idempotente)
  await setupNotificationsTopology(url);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationsModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue: NOTIFICATIONS_QUEUE,
        queueOptions: notificationsQueueOptions,
        noAck: false,
        prefetchCount: 1,
      },
    },
  );

  await app.listen();
  new Logger('Notifications').log(`Consumindo ${NOTIFICATIONS_QUEUE}`);
}

bootstrap();
