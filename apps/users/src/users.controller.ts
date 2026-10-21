import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('users.findAll')
  findAll() {
    return this.usersService.findAll();
  }

  @MessagePattern('users.findOne')
  findOne(id: number) {
    return this.usersService.findOne(id);
  }
}