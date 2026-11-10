import { Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  UpdateUserDto,
  rpcError,
  translatePrismaError,
} from '@app/contracts';

import { PrismaService } from './prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      return translatePrismaError(error, 'Usuário não encontrado');
    }
  }

  findAll() {
    return this.prisma.user.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      // RpcException (e não NotFoundException): o erro precisa ser serializável
      // pelo transporte e traduzido para HTTP pelo Gateway.
      throw rpcError(404, 'Usuário não encontrado', 'Not Found');
    }

    return user;
  }

  async update(id: number, data: UpdateUserDto) {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      return translatePrismaError(error, 'Usuário não encontrado');
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      return translatePrismaError(error, 'Usuário não encontrado');
    }
  }
}
