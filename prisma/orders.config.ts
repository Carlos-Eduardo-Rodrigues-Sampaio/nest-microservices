import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // Caminhos relativos a ESTE arquivo (pasta prisma/), não à raiz do projeto
  schema: 'orders/schema.prisma',
  migrations: {
    path: 'orders/migrations',
  },
  datasource: {
    url: env('ORDERS_DATABASE_URL'),
  },
});
