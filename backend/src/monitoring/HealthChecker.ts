import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { metricsCollector } from './MetricsCollector';

/**
 * Comprehensive Health Monitoring System
 * Monitors all critical system components and dependencies
 */

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: Date;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export class HealthChecker {
  private prisma: PrismaClient;
  private redis: Redis;
  private checks: Map<string, HealthCheck> = new Map();
  private isRunning = false;
  private interval?: NodeJS.Timeout;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  async start(intervalMs: number = 30000) {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('Starting health checker', { interval: intervalMs });

    // Initial health check
    await this.performHealthChecks();

    // Schedule periodic checks
    this.interval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, intervalMs);
  }

  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    logger.info('Health checker stopped');
  }

  private async performHealthChecks(): Promise<void> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDiskSpace(),
      this.checkExternalAPIs(),
      this.checkWorkflowEngine(),
      this.checkAIServices(),
      this.checkStripeConnection()
    ]);

    // Process results and update metrics
    checks.forEach((result, index) => {
      const checkNames = [
        'database',
        'redis',
        'memory',
        'disk',
        'external_apis',
        'workflow_engine',
        'ai_services',
        'stripe'
      ];

      if (result.status === 'fulfilled' && result.value) {
        this.checks.set(checkNames[index], result.value);
      } else if (result.status === 'rejected') {
        this.checks.set(checkNames[index], {
          service: checkNames[index],
          status: 'unhealthy',
          message: result.reason?.message || 'Health check failed',
          timestamp: new Date()
        });
      }
    });

    // Update system health metrics
    this.updateHealthMetrics();
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      // Check connection pool
      const connections = await this.prisma.$queryRaw<Array<{count: number}>>`
        SELECT count(*) as count FROM pg_stat_activity 
        WHERE application_name LIKE '%prisma%'
      `;

      metricsCollector.updateDatabaseConnections('postgresql', 'active', Number(connections[0]?.count || 0));

      return {
        service: 'database',
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
        metadata: {
          connections: connections[0]?.count || 0
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        service: 'database',
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      await this.redis.ping();
      const latency = Date.now() - start;

      // Check Redis info
      const info = await this.redis.info('memory');
      const usedMemory = this.parseRedisInfo(info, 'used_memory');
      const maxMemory = this.parseRedisInfo(info, 'maxmemory') || Infinity;

      return {
        service: 'redis',
        status: latency > 500 ? 'degraded' : 'healthy',
        latency,
        metadata: {
          usedMemory,
          maxMemory,
          memoryUsagePercent: maxMemory === Infinity ? 0 : (usedMemory / maxMemory) * 100
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        service: 'redis',
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed + memUsage.external;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    return {
      service: 'memory',
      status: memoryUsagePercent > 90 ? 'unhealthy' : 
              memoryUsagePercent > 75 ? 'degraded' : 'healthy',
      metadata: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usagePercent: memoryUsagePercent
      },
      timestamp: new Date()
    };
  }

  private async checkDiskSpace(): Promise<HealthCheck> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.statfs(process.cwd());
      
      const totalSpace = stats.bavail * stats.bsize;
      const freeSpace = stats.bfree * stats.bsize;
      const usedPercent = ((totalSpace - freeSpace) / totalSpace) * 100;

      return {
        service: 'disk',
        status: usedPercent > 90 ? 'unhealthy' :
                usedPercent > 80 ? 'degraded' : 'healthy',
        metadata: {
          totalSpace,
          freeSpace,
          usedPercent
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        service: 'disk',
        status: 'degraded',
        message: 'Unable to check disk space',
        timestamp: new Date()
      };
    }
  }

  private async checkExternalAPIs(): Promise<HealthCheck> {
    const checks = [
      this.checkEndpoint('https://httpstat.us/200', 'httpstat'),
      // Add other external API checks as needed
    ];

    const results = await Promise.allSettled(checks);
    const failed = results.filter(r => r.status === 'rejected').length;
    const total = results.length;

    return {
      service: 'external_apis',
      status: failed === 0 ? 'healthy' : 
              failed < total / 2 ? 'degraded' : 'unhealthy',
      metadata: {
        total,
        healthy: total - failed,
        failed
      },
      timestamp: new Date()
    };
  }

  private async checkWorkflowEngine(): Promise<HealthCheck> {
    try {
      // Check if Temporal is responsive
      const start = Date.now();
      
      // This would connect to your Temporal server
      // For now, simulate the check
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const latency = Date.now() - start;

      return {
        service: 'workflow_engine',
        status: latency > 2000 ? 'degraded' : 'healthy',
        latency,
        metadata: {
          engine: 'temporal'
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        service: 'workflow_engine',
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  private async checkAIServices(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      
      // Check OpenAI API health (simple ping)
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000)
      });

      const latency = Date.now() - start;

      return {
        service: 'ai_services',
        status: !response.ok ? 'unhealthy' :
                latency > 3000 ? 'degraded' : 'healthy',
        latency,
        metadata: {
          provider: 'openai',
          statusCode: response.status
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        service: 'ai_services',
        status: 'degraded',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  private async checkStripeConnection(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      
      // Simple Stripe API health check
      const response = await fetch('https://api.stripe.com/v1/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
        signal: AbortSignal.timeout(5000)
      });

      const latency = Date.now() - start;

      return {
        service: 'stripe',
        status: !response.ok ? 'unhealthy' :
                latency > 2000 ? 'degraded' : 'healthy',
        latency,
        metadata: {
          statusCode: response.status
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        service: 'stripe',
        status: 'degraded',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  private async checkEndpoint(url: string, name: string): Promise<void> {
    const start = Date.now();
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(5000) 
    });
    
    const latency = Date.now() - start;
    
    metricsCollector.trackIntegrationCall(
      name,
      url,
      response.ok ? 'success' : 'error',
      latency / 1000
    );

    if (!response.ok) {
      throw new Error(`${name} returned ${response.status}`);
    }
  }

  private parseRedisInfo(info: string, key: string): number {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1], 10) : 0;
  }

  private updateHealthMetrics(): void {
    const checks = Array.from(this.checks.values());
    const summary = {
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length
    };

    // Track health metrics
    checks.forEach(check => {
      metricsCollector.trackError(
        'system',
        check.service,
        check.status === 'unhealthy' ? 'high' : 
        check.status === 'degraded' ? 'medium' : 'low'
      );
    });

    logger.info('Health check completed', summary);
  }

  public async getHealth(): Promise<SystemHealth> {
    const checks = Array.from(this.checks.values());
    const summary = {
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length
    };

    const overallStatus = summary.unhealthy > 0 ? 'unhealthy' :
                         summary.degraded > 0 ? 'degraded' : 'healthy';

    return {
      status: overallStatus,
      uptime: process.uptime(),
      timestamp: new Date(),
      checks,
      summary
    };
  }

  public async getServiceHealth(serviceName: string): Promise<HealthCheck | undefined> {
    return this.checks.get(serviceName);
  }
}

export default HealthChecker;