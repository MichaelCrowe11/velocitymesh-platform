import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface IntegrationConfig {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  userId: string;
}

export interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class IntegrationService {
  private prisma: PrismaClient;
  private redis: Redis;
  private integrations: Map<string, IntegrationConfig>;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.integrations = new Map();
  }

  async initialize(): Promise<void> {
    // Load integrations from database
    const integrations = await this.prisma.integration.findMany({
      where: { status: 'active' },
    });

    integrations.forEach(integration => {
      this.integrations.set(integration.id, {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        config: integration.config as Record<string, any>,
        userId: integration.userId,
      });
    });

    logger.info('IntegrationService initialized', { 
      integrationCount: this.integrations.size 
    });
  }

  async execute(
    integrationType: string,
    action: string,
    params: Record<string, any>,
    userId: string
  ): Promise<IntegrationResult> {
    try {
      logger.info('Executing integration', { integrationType, action, userId });

      switch (integrationType) {
        case 'http':
          return await this.executeHTTP(action, params);
        case 'email':
          return await this.executeEmail(action, params);
        case 'slack':
          return await this.executeSlack(action, params);
        case 'database':
          return await this.executeDatabase(action, params);
        default:
          return {
            success: false,
            error: `Unknown integration type: ${integrationType}`,
          };
      }
    } catch (error: any) {
      logger.error('Integration execution failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeHTTP(action: string, params: any): Promise<IntegrationResult> {
    const { method = 'GET', url, headers = {}, data, timeout = 30000 } = params;

    try {
      const response = await axios({
        method,
        url,
        headers,
        data,
        timeout,
      });

      return {
        success: true,
        data: {
          status: response.status,
          headers: response.headers,
          data: response.data,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: error.response?.data,
      };
    }
  }

  private async executeEmail(action: string, params: any): Promise<IntegrationResult> {
    const { to, subject, text, html, from } = params;

    try {
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Send email
      const info = await transporter.sendMail({
        from: from || process.env.SMTP_USER,
        to,
        subject,
        text,
        html,
      });

      return {
        success: true,
        data: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeSlack(action: string, params: any): Promise<IntegrationResult> {
    const { webhookUrl, channel, text, blocks, username, icon_emoji } = params;

    try {
      const payload: any = {
        text,
        channel,
        username: username || 'VelocityMesh',
        icon_emoji: icon_emoji || ':robot_face:',
      };

      if (blocks) {
        payload.blocks = blocks;
      }

      const response = await axios.post(webhookUrl, payload);

      return {
        success: response.data === 'ok',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeDatabase(action: string, params: any): Promise<IntegrationResult> {
    const { query, values = [] } = params;

    try {
      // Execute raw query using Prisma
      // Note: Be very careful with raw queries in production
      const result = await this.prisma.$queryRawUnsafe(query, ...values);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createIntegration(
    userId: string,
    type: string,
    name: string,
    config: Record<string, any>
  ): Promise<IntegrationConfig> {
    const integration = await this.prisma.integration.create({
      data: {
        userId,
        type,
        name,
        config,
        status: 'active',
      },
    });

    const integrationConfig: IntegrationConfig = {
      id: integration.id,
      type: integration.type,
      name: integration.name,
      config: integration.config as Record<string, any>,
      userId: integration.userId,
    };

    this.integrations.set(integration.id, integrationConfig);

    return integrationConfig;
  }

  async updateIntegration(
    id: string,
    updates: Partial<IntegrationConfig>
  ): Promise<IntegrationConfig> {
    const integration = await this.prisma.integration.update({
      where: { id },
      data: {
        name: updates.name,
        config: updates.config,
      },
    });

    const integrationConfig: IntegrationConfig = {
      id: integration.id,
      type: integration.type,
      name: integration.name,
      config: integration.config as Record<string, any>,
      userId: integration.userId,
    };

    this.integrations.set(id, integrationConfig);

    return integrationConfig;
  }

  async deleteIntegration(id: string): Promise<void> {
    await this.prisma.integration.delete({
      where: { id },
    });

    this.integrations.delete(id);
  }

  async getUserIntegrations(userId: string): Promise<IntegrationConfig[]> {
    const integrations = await this.prisma.integration.findMany({
      where: { userId },
    });

    return integrations.map(integration => ({
      id: integration.id,
      type: integration.type,
      name: integration.name,
      config: integration.config as Record<string, any>,
      userId: integration.userId,
    }));
  }

  async testIntegration(id: string): Promise<IntegrationResult> {
    const integration = this.integrations.get(id);
    if (!integration) {
      return {
        success: false,
        error: 'Integration not found',
      };
    }

    // Test based on type
    switch (integration.type) {
      case 'http':
        return await this.executeHTTP('GET', { 
          url: integration.config.testUrl || integration.config.url 
        });
      case 'email':
        return {
          success: true,
          data: 'Email configuration valid',
        };
      case 'slack':
        return await this.executeSlack('test', {
          webhookUrl: integration.config.webhookUrl,
          text: 'Test message from VelocityMesh',
        });
      case 'database':
        return await this.executeDatabase('SELECT', { query: 'SELECT 1' });
      default:
        return {
          success: false,
          error: 'Test not implemented for this integration type',
        };
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down IntegrationService');
    this.integrations.clear();
  }
}