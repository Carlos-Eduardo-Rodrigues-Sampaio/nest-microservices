import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { RpcToHttpExceptionFilter } from './rpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new RpcToHttpExceptionFilter());

  const port = Number(process.env.GATEWAY_PORT ?? 3000);
  await app.listen(port);
  new Logger('Gateway').log(`API Gateway (HTTP) em http://localhost:${port}`);
}

bootstrap();
