import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { OrdersController } from './orders.controller';
import { UsersController } from './users.controller';

@Module({
  imports: [
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
        name: 'ORDERS_SERVICE',
        useFactory: () => ({
          transport: Transport.TCP,
          options: {
            host: process.env.ORDERS_SERVICE_HOST ?? '127.0.0.1',
            port: Number(process.env.ORDERS_SERVICE_PORT ?? 3002),
          },
        }),
      },
    ]),
  ],
  controllers: [UsersController, OrdersController],
})
export class AppModule {}
