import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { createRpcValidationPipe } from '@app/contracts';

import { UsersModule } from './users.module';

async function bootstrap() {
  const host = process.env.USERS_SERVICE_HOST ?? '127.0.0.1';
  const port = Number(process.env.USERS_SERVICE_PORT ?? 3001);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UsersModule,
    {
      transport: Transport.TCP,
      options: { host, port },
    },
  );

  app.useGlobalPipes(createRpcValidationPipe());

  await app.listen();
  new Logger('Users').log(`Users Service (TCP) em ${host}:${port}`);
}

bootstrap();
