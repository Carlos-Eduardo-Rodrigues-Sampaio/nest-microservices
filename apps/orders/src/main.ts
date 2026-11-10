import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { createRpcValidationPipe } from '@app/contracts';

import { OrdersModule } from './orders.module';

async function bootstrap() {
  const host = process.env.ORDERS_SERVICE_HOST ?? '127.0.0.1';
  const port = Number(process.env.ORDERS_SERVICE_PORT ?? 3002);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrdersModule,
    {
      transport: Transport.TCP,
      options: { host, port },
    },
  );

  app.useGlobalPipes(createRpcValidationPipe());

  await app.listen();
  new Logger('Orders').log(`Orders Service (TCP) em ${host}:${port}`);
}

bootstrap();
