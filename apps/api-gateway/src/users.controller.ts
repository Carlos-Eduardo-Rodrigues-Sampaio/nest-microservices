import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserDto, UpdateUserDto } from '@app/contracts';
import { timeout } from 'rxjs';

const TIMEOUT_MS = 5000;

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USERS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.client.send('users.create', dto).pipe(timeout(TIMEOUT_MS));
  }

  @Get()
  findAll() {
    return this.client.send('users.findAll', {}).pipe(timeout(TIMEOUT_MS));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.client.send('users.findOne', id).pipe(timeout(TIMEOUT_MS));
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.client
      .send('users.update', { id, data: dto })
      .pipe(timeout(TIMEOUT_MS));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.client.send('users.remove', id).pipe(timeout(TIMEOUT_MS));
  }
}
