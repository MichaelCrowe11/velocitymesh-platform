import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createWorker, Client as TemporalClient } from '@temporalio/client';
import { Worker } from '@temporalio/worker';
import jwt from 'jsonwebtoken';
import winston from 'winston';

// Import routes
import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflows';
import integrationRoutes from './routes/integrations';
import aiRoutes from './routes/ai';
import collaborationRoutes from './routes/collaboration';

// Import middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import services
import { WorkflowOrchestrator } from './services/WorkflowOrchestrator';
import { AIService } from './services/AIService';
import { CollaborationService } from './services/CollaborationService';
import { IntegrationService } from './services/IntegrationService';

// Import Temporal workflows and activities
import * as workflows from './temporal/workflows';
import * as activities from './temporal/activities';

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'velocitymesh-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Environment configuration
const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  temporalAddress: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
};

class VelocityMeshServer {
  private app: ReturnType<typeof fastify>;
  private prisma: PrismaClient;
  private redis: Redis;
  private temporalClient: TemporalClient | null = null;
  private temporalWorker: Worker | null = null;
  private services: {
    workflow: WorkflowOrchestrator;
    ai: AIService;
    collaboration: CollaborationService;
    integration: IntegrationService;
  };

  constructor() {
    this.app = fastify({ 
      logger: {
        level: config.nodeEnv === 'production' ? 'warn' : 'info',
        transport: config.nodeEnv === 'development' ? {
          target: 'pino-pretty',
          options: { colorize: true }
        } : undefined
      }
    });
    
    this.prisma = new PrismaClient();
    this.redis = new Redis(config.redisUrl);
    
    this.services = {
      workflow: new WorkflowOrchestrator(this.prisma, this.redis),
      ai: new AIService(this.prisma, this.redis),
      collaboration: new CollaborationService(this.redis),
      integration: new IntegrationService(this.prisma, this.redis),
    };
  }

  private async setupMiddleware() {
    // Security middleware
    await this.app.register(helmet, {
      contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
    });

    // CORS configuration
    await this.app.register(cors, {
      origin: config.corsOrigin,
      credentials: true,
    });

    // Rate limiting
    await this.app.register(rateLimit, {
      max: config.rateLimitMax,
      timeWindow: config.rateLimitWindow,
    });

    // WebSocket support
    await this.app.register(websocket);

    // Request logging
    this.app.addHook('onRequest', requestLogger);

    // Authentication middleware
    this.app.decorate('authenticate', authMiddleware);
  }

  private async setupRoutes() {
    // Health check
    this.app.get('/health', async () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        services: {
          database: await this.checkDatabase(),
          redis: await this.checkRedis(),
          temporal: await this.checkTemporal(),
        }
      };
    });

    // API routes
    await this.app.register(authRoutes, { prefix: '/api/auth' });
    await this.app.register(workflowRoutes, { 
      prefix: '/api/workflows',
      workflowService: this.services.workflow 
    });
    await this.app.register(integrationRoutes, { 
      prefix: '/api/integrations',
      integrationService: this.services.integration 
    });
    await this.app.register(aiRoutes, { 
      prefix: '/api/ai',
      aiService: this.services.ai 
    });
    await this.app.register(collaborationRoutes, { 
      prefix: '/api/collaboration',
      collaborationService: this.services.collaboration 
    });

    // WebSocket endpoints
    this.app.register(async (fastify) => {
      fastify.get('/ws/collaboration', { websocket: true }, (connection, req) => {
        this.services.collaboration.handleWebSocketConnection(connection.socket, req);
      });
    });

    // Error handling
    this.app.setErrorHandler(errorHandler);
  }

  private async setupTemporal() {
    try {
      // Initialize Temporal client
      this.temporalClient = new TemporalClient({
        address: config.temporalAddress,
      });

      // Create and start Temporal worker
      this.temporalWorker = await createWorker({
        workflowsPath: require.resolve('./temporal/workflows'),
        activitiesPath: require.resolve('./temporal/activities'),
        taskQueue: 'velocitymesh-workflows',
        connection: {
          address: config.temporalAddress,
        }
      });

      await this.temporalWorker.run();
      logger.info('Temporal worker started successfully');
    } catch (error) {
      logger.error('Failed to setup Temporal:', error);
      throw error;
    }
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch (error) {
      logger.error('Database health check failed:', error);
      return 'disconnected';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      await this.redis.ping();
      return 'connected';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return 'disconnected';
    }
  }

  private async checkTemporal(): Promise<string> {
    try {
      if (this.temporalClient) {
        await this.temporalClient.connection.healthService.check({});
        return 'connected';
      }
      return 'not_initialized';
    } catch (error) {
      logger.error('Temporal health check failed:', error);
      return 'disconnected';
    }
  }

  public async start() {
    try {
      // Setup middleware and routes
      await this.setupMiddleware();
      await this.setupRoutes();
      
      // Initialize services
      await this.services.workflow.initialize();
      await this.services.ai.initialize();
      await this.services.collaboration.initialize();
      await this.services.integration.initialize();

      // Setup Temporal (can run in background)
      this.setupTemporal().catch(error => {
        logger.warn('Temporal setup failed, continuing without it:', error);
      });

      // Start server
      await this.app.listen({ port: config.port, host: config.host });
      
      logger.info(`VelocityMesh server started on ${config.host}:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop() {
    try {
      // Gracefully shutdown services
      await this.services.workflow.shutdown();
      await this.services.ai.shutdown();
      await this.services.collaboration.shutdown();
      await this.services.integration.shutdown();

      // Close Temporal worker
      if (this.temporalWorker) {
        await this.temporalWorker.shutdown();
      }

      // Close connections
      await this.prisma.$disconnect();
      await this.redis.quit();
      await this.app.close();
      
      logger.info('Server shut down gracefully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Initialize server
const server = new VelocityMeshServer();

// Handle graceful shutdown
process.on('SIGINT', () => server.stop());
process.on('SIGTERM', () => server.stop());

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default server;