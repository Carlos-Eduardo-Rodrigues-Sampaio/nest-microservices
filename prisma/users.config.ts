import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // Caminhos relativos a ESTE arquivo (pasta prisma/), não à raiz do projeto
  schema: 'users/schema.prisma',
  migrations: {
    path: 'users/migrations',
  },
  datasource: {
    url: env('USERS_DATABASE_URL'),
  },
});
