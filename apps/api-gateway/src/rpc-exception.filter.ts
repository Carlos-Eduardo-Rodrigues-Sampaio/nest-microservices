import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Traduz erros vindos dos microserviços em respostas HTTP.
 *
 * - HttpException (ex.: validação do próprio Gateway) → mantida como está
 * - RpcException({ statusCode, message }) → statusCode/message do serviço
 * - TimeoutError (rxjs) → 504
 * - Conexão recusada / serviço fora do ar → 503
 * - Qualquer outro erro → 500
 */
@Catch()
export class RpcToHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Gateway');

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json(exception.getResponse());
    }

    const err = exception as {
      statusCode?: number;
      message?: string | string[];
      error?: string;
      name?: string;
      code?: string;
    } | null;

    if (err && typeof err.statusCode === 'number') {
      return response.status(err.statusCode).json({
        statusCode: err.statusCode,
        message: err.message,
        error: err.error,
      });
    }

    if (err?.name === 'TimeoutError') {
      return response.status(504).json({
        statusCode: 504,
        message: 'O microserviço não respondeu a tempo',
        error: 'Gateway Timeout',
      });
    }

    if (err?.code === 'ECONNREFUSED' || err?.code === 'ECONNRESET') {
      return response.status(503).json({
        statusCode: 503,
        message: 'Microserviço indisponível',
        error: 'Service Unavailable',
      });
    }

    this.logger.error(`Erro inesperado: ${JSON.stringify(exception)}`);
    return response.status(500).json({
      statusCode: 500,
      message: 'Erro interno do servidor',
      error: 'Internal Server Error',
    });
  }
}
