import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { NOTIFICATIONS_QUEUE, notificationsQueueOptions } from '@app/contracts';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OutboxPublisher } from './outbox.publisher';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // registerAsync: as variáveis de ambiente são lidas na criação do módulo,
    // depois de o dotenv ter sido carregado pelo main.ts.
    ClientsModule.registerAsync([
      {
        name: 'USERS_SERVICE',
        useFactory: () => ({
          transport: Transport.TCP,
          options: {
            host: process.env.USERS_SERVICE_HOST ?? '127.0.0.1',
            port: Number(process.env.USERS_SERVICE_PORT ?? 3001),
          },
        }),
      },
      {
        name: 'NOTIFICATIONS_CLIENT',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL!],
            queue: NOTIFICATIONS_QUEUE,
            // Mesmos argumentos (DLX) do consumidor, senão o RabbitMQ
            // responde PRECONDITION_FAILED ao declarar a fila.
            queueOptions: notificationsQueueOptions,
            persistent: true,
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, OutboxPublisher],
})
export class OrdersModule {}
