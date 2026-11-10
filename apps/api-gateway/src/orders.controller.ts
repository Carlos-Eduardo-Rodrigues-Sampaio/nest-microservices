import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from '@app/contracts';
import { timeout } from 'rxjs';

const TIMEOUT_MS = 8000; // maior que o timeout de 3s do Orders → Users

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDERS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.client.send('orders.create', dto).pipe(timeout(TIMEOUT_MS));
  }

  @Get()
  findAll() {
    return this.client.send('orders.findAll', {}).pipe(timeout(TIMEOUT_MS));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.client.send('orders.findOne', id).pipe(timeout(TIMEOUT_MS));
  }
}
