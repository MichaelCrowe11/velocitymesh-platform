import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  subscriptionPlan: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
  
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      reply.code(401).send({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as AuthUser;
    
    // Attach user to request
    request.user = decoded;
    
  } catch (error) {
    logger.error('Authentication failed:', error);
    reply.code(401).send({ error: 'Invalid token' });
  }
}