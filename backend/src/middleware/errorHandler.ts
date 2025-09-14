import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    url: request.url,
    method: request.method,
  });

  const statusCode = error.statusCode || 500;
  const response = {
    error: {
      message: error.message || 'Internal Server Error',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  };

  reply.code(statusCode).send(response);
}