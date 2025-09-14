import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  });

  // Add hook to log response
  reply.addHook('onSend', async (request, reply, payload) => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
    });
    
    return payload;
  });
}