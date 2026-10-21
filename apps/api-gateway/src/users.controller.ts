import {
  Controller,
  Get,
  Param,
  Inject,
} from '@nestjs/common';

import { ClientProxy } from '@nestjs/microservices';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USERS_SERVICE')
    private readonly usersClient: ClientProxy,
  ) {}

  @Get()
  findAll() {
    return this.usersClient.send(
      'users.findAll',
      {},
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersClient.send(
      'users.findOne',
      Number(id),
    );
  }
}