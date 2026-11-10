# NestJS Microservices — Gateway, Users, Orders e Notifications

Projeto completo das três aulas: **API Gateway** (HTTP) → **Users** e **Orders** (TCP, Prisma + PostgreSQL) → **Notifications** (RabbitMQ, ACK/NACK, DLQ, idempotência), com **Transactional Outbox** no Orders.

```
Cliente HTTP ─▶ API Gateway :3000 ──TCP──▶ Users  :3001 ─▶ users_db
                                  └─TCP──▶ Orders :3002 ─▶ orders_db (+ OutboxEvent)
                                              │  └─TCP─▶ Users (valida o usuário)
                                              └─ OutboxPublisher ─▶ RabbitMQ ─▶ Notifications ─▶ notifications_db
                                                                          └─ falhas ─▶ notifications_dlq
```

## Pré-requisitos

- Node.js **20.19+** (testado com Node 22)
- Docker + Docker Compose v2

## Instalação e execução

```bash
npm install

# 1) Sobe PostgreSQL (users_db, orders_db, notifications_db) e RabbitMQ
npm run infra:up

# 2) Gera os clients do Prisma e aplica as migrations nos 3 bancos
npm run prisma:generate
npm run prisma:migrate:deploy

# 3) Sobe os 4 serviços em um único terminal
npm run dev
```

Atalho para os passos 1 e 2 (mais a topologia do RabbitMQ): `npm run setup`.

Ou, como nas aulas, um serviço por terminal:

```bash
npm run start:dev users
npm run start:dev orders
npm run start:dev notifications
npm run start:dev api-gateway
```

- Painel RabbitMQ: http://localhost:15672 (usuário `app`, senha `app123`)
- PostgreSQL: `localhost:5432` (usuário `postgres`, senha `postgres`)

Credenciais apenas para desenvolvimento local.

> O `init.sql` que cria os bancos só roda na **primeira** criação do volume. Se já tinha um volume antigo: `docker compose down -v` (apaga os dados) e suba de novo.

## Testando

```bash
curl -X POST localhost:3000/users -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com"}'

curl -X POST localhost:3000/orders -H "Content-Type: application/json" \
  -d '{"userId":1,"description":"Notebook Dell","total":4500}'
```

No terminal do Notifications aparecerá `Notificação do pedido 1 / Usuário: 1 / Total: R$ 4500`.
Mais exemplos em `requests.http`.

**DLQ:** crie um pedido com `"total": 9999` (valor configurável em `NOTIFICATIONS_SIMULATE_FAILURE_TOTAL`). A mensagem falha, recebe `nack` sem requeue e aparece em `notifications_dlq` no painel do RabbitMQ.

## Estrutura

```
apps/
  api-gateway/    HTTP :3000 — rotas /users e /orders, timeout e filtro RPC→HTTP
  users/          TCP :3001 — CRUD (Prisma → users_db)
  orders/         TCP :3002 — pedidos (Prisma → orders_db) + Outbox publisher
  notifications/  RabbitMQ — consome order.created (Prisma → notifications_db)
libs/contracts/   DTOs, evento OrderCreatedEvent, erros RPC, topologia RabbitMQ
prisma/           schema, config e migrations de cada serviço
docker-compose.yml, docker/postgres/init.sql
```

## Correções em relação ao texto das aulas

| # | Problema no tutorial | Correção |
|---|----------------------|----------|
| 1 | `prisma/*.config.ts` usava `schema: 'prisma/users/schema.prisma'`. O Prisma resolve esses caminhos **relativos ao arquivo de config**, resultando em `prisma/prisma/users/...` ("Could not load schema"). | Caminhos agora são `users/schema.prisma` e `users/migrations` (idem orders/notifications). |
| 2 | `NotFoundException` (exceção HTTP) lançada nos microserviços chegava ao Gateway como erro 500. | Microserviços lançam `RpcException({ statusCode, message })`; o Gateway tem um filtro global que converte em 404/409/400/503/504. |
| 3 | No Orders, `if (!user)` nunca executava: o Users **lança erro** quando não acha o usuário, em vez de devolver `null`. | `try/catch` em volta da chamada: 404 do Users → 400 "Usuário inválido"; timeout/indisponibilidade → 503. |
| 4 | `update`/`delete` de registro inexistente (Prisma `P2025`) e e-mail duplicado (`P2002`) geravam 500. | Traduzidos para 404 e 409. |
| 5 | `GET /orders/:id` e `findOne` inexistente devolviam `null` com HTTP 200. | Retorna 404. |
| 6 | `ValidationPipe` nos microserviços lança exceções HTTP, sem sentido sobre TCP/RMQ. | `createRpcValidationPipe()` converte erros de validação em `RpcException(400)`. |
| 7 | A fila `notifications_queue` era criada pelo script com argumentos de DLX, mas Notifications e Orders a declaravam só com `durable: true` → `PRECONDITION_FAILED` ao iniciar. | Consumidor e produtor usam as mesmas `queueOptions` (com DLX), definidas em `libs/contracts`. |
| 8 | Se o script de topologia não fosse rodado, a DLQ não existia e as mensagens rejeitadas eram descartadas. | O Notifications declara DLX/DLQ/fila automaticamente ao iniciar (`rabbit:setup` continua disponível). |
| 9 | O controller de Notifications fazia `nack` e depois `throw error`. | Apenas `nack` (sem requeue) + log do erro. |
| 10 | O `OrdersService` das Partes 3 e 7 publicava o evento duas vezes (emit direto + Outbox). | Versão final usa só o Outbox. |
| 11 | O publisher do Outbox usava `emit()` sem timeout, então uma publicação podia ficar pendente enquanto o RabbitMQ estivesse fora. | `timeout(5000)`; em falha o evento fica pendente e é tentado de novo (ordem preservada). Testado derrubando e religando o broker. |
| 12 | `ProcessedEvent` e a idempotência eram só descritos. | Implementados: banco `notifications_db`, registro + efeito na mesma transação, duplicata detectada por `P2002`. |
| 13 | `process.env.RABBITMQ_URL!` avaliado na decoração do módulo dependia da ordem de import do dotenv. | `ClientsModule.registerAsync` com `useFactory`. |
| 14 | O Gateway chamava os serviços sem timeout. | `timeout()` em todas as chamadas. |

## Limitações conhecidas

- Com **várias instâncias** do Orders, mais de uma pode ler o mesmo evento pendente do Outbox (o consumidor é idempotente, então não há efeito duplicado). Em produção use `FOR UPDATE SKIP LOCKED` ou lease.
- Retry com atraso (fila de retry com TTL) e os exercícios finais da Parte 2 ficaram de fora, como nas aulas.
- Não há autenticação nem TLS entre serviços.

## Comandos úteis

```bash
npm run build                 # compila os 4 apps
npm run infra:down            # para os containers
npm run prisma:migrate:dev:users -- --name minha_mudanca   # nova migration (users)
```
