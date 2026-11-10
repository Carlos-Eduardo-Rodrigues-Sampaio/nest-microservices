import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateUserDto, UpdateUserDto } from '@app/contracts';

import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('users.create')
  create(@Payload() data: CreateUserDto) {
    return this.usersService.create(data);
  }

  @MessagePattern('users.findAll')
  findAll() {
    return this.usersService.findAll();
  }

  @MessagePattern('users.findOne')
  findOne(@Payload() id: number) {
    return this.usersService.findOne(id);
  }

  @MessagePattern('users.update')
  update(@Payload() payload: { id: number; data: UpdateUserDto }) {
    return this.usersService.update(payload.id, payload.data);
  }

  @MessagePattern('users.remove')
  remove(@Payload() id: number) {
    return this.usersService.remove(id);
  }
}
