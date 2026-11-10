import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // Caminhos relativos a ESTE arquivo (pasta prisma/), não à raiz do projeto
  schema: 'notifications/schema.prisma',
  migrations: {
    path: 'notifications/migrations',
  },
  datasource: {
    url: env('NOTIFICATIONS_DATABASE_URL'),
  },
});
