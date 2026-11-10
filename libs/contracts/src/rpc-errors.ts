import { ValidationPipe } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

/**
 * Formato dos erros trafegados entre microserviços.
 * O API Gateway converte este formato em respostas HTTP.
 */
export interface RpcErrorPayload {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export function rpcError(
  statusCode: number,
  message: string | string[],
  error?: string,
): RpcException {
  return new RpcException({ statusCode, message, error } satisfies RpcErrorPayload);
}

/**
 * Converte erros conhecidos do Prisma em RpcException.
 * P2002 = violação de unicidade, P2025 = registro não encontrado.
 * Qualquer outro erro é relançado sem alteração.
 */
export function translatePrismaError(error: unknown, notFoundMessage: string): never {
  const code = (error as { code?: string } | null)?.code;

  if (code === 'P2025') {
    throw rpcError(404, notFoundMessage, 'Not Found');
  }
  if (code === 'P2002') {
    throw rpcError(409, 'Registro duplicado (violação de unicidade)', 'Conflict');
  }
  throw error;
}

/**
 * ValidationPipe para microserviços: erros de validação viram RpcException(400)
 * em vez de HttpException, que não faria sentido no transporte TCP/RMQ.
 */
export function createRpcValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => {
      const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      return rpcError(400, messages, 'Bad Request');
    },
  });
}
