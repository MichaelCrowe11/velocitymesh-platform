import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import axios from 'axios';
import { logger } from '../utils/logger';

export interface AIRequest {
  type: 'natural_language' | 'optimization' | 'debug' | 'suggestion';
  input: string | Record<string, any>;
  context?: Record<string, any>;
}

export interface AIResponse {
  success: boolean;
  result?: any;
  error?: string;
  confidence?: number;
  suggestions?: string[];
}

export class AIService {
  private prisma: PrismaClient;
  private redis: Redis;
  private aiEngineUrl: string;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000';
  }

  async initialize(): Promise<void> {
    logger.info('AIService initialized');
    // Test AI engine connection
    try {
      const response = await axios.get(`${this.aiEngineUrl}/health`);
      logger.info('AI Engine connected:', response.data);
    } catch (error) {
      logger.warn('AI Engine not available, some features will be limited');
    }
  }

  async processNaturalLanguage(
    text: string,
    userId: string,
    context?: Record<string, any>
  ): Promise<AIResponse> {
    try {
      logger.info('Processing natural language request', { userId, textLength: text.length });

      // Check cache first
      const cacheKey = `ai:nlp:${Buffer.from(text).toString('base64').substring(0, 32)}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Call AI engine
      const response = await axios.post(
        `${this.aiEngineUrl}/api/v1/nlp/process`,
        {
          natural_language: text,
          context: {
            ...context,
            userId,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.AI_ENGINE_API_KEY || ''}`,
          },
        }
      );

      const result: AIResponse = {
        success: true,
        result: response.data.workflow,
        confidence: response.data.confidence,
        suggestions: response.data.suggestions,
      };

      // Cache result
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);

      return result;
    } catch (error: any) {
      logger.error('Natural language processing failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to process natural language',
      };
    }
  }

  async optimizeWorkflow(
    workflow: any,
    goals?: string[]
  ): Promise<AIResponse> {
    try {
      logger.info('Optimizing workflow', { workflowId: workflow.id, goals });

      const response = await axios.post(
        `${this.aiEngineUrl}/api/v1/workflows/optimize`,
        {
          workflow,
          optimization_goals: goals,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.AI_ENGINE_API_KEY || ''}`,
          },
        }
      );

      return {
        success: true,
        result: response.data.optimizations,
        confidence: response.data.estimated_improvement?.performance,
      };
    } catch (error: any) {
      logger.error('Workflow optimization failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to optimize workflow',
      };
    }
  }

  async debugWorkflow(
    workflow: any,
    executionLog?: any[]
  ): Promise<AIResponse> {
    try {
      logger.info('Debugging workflow', { workflowId: workflow.id });

      const response = await axios.post(
        `${this.aiEngineUrl}/api/v1/debug/analyze`,
        {
          workflow,
          execution_log: executionLog,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.AI_ENGINE_API_KEY || ''}`,
          },
        }
      );

      return {
        success: true,
        result: response.data.insights,
        suggestions: response.data.recommendations,
      };
    } catch (error: any) {
      logger.error('Workflow debugging failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to debug workflow',
      };
    }
  }

  async getSuggestions(
    workflowData: any,
    type: 'completion' | 'optimization' | 'error_fix'
  ): Promise<string[]> {
    try {
      // Simple suggestion logic for now
      const suggestions: string[] = [];
      
      switch (type) {
        case 'completion':
          suggestions.push('Add error handling node');
          suggestions.push('Connect to notification service');
          suggestions.push('Add data validation step');
          break;
        case 'optimization':
          suggestions.push('Parallelize independent operations');
          suggestions.push('Cache frequently accessed data');
          suggestions.push('Reduce API calls with batching');
          break;
        case 'error_fix':
          suggestions.push('Check input data format');
          suggestions.push('Verify API credentials');
          suggestions.push('Add retry logic');
          break;
      }

      return suggestions;
    } catch (error) {
      logger.error('Failed to get suggestions:', error);
      return [];
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down AIService');
  }
}