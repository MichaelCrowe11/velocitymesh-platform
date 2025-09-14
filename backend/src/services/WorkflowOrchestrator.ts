import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Client as TemporalClient, WorkflowClient } from '@temporalio/client';
import { logger } from '../utils/logger';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggers: WorkflowTrigger[];
  createdBy: string;
  updatedAt: Date;
  status: 'draft' | 'active' | 'paused' | 'archived';
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'loop' | 'ai_assistant';
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'completed' | 'failed';
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'conditional';
  condition?: string;
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  executionPath: string[];
  metrics: {
    duration?: number;
    nodesExecuted: number;
    computeTimeMs: number;
  };
}

export class WorkflowOrchestrator {
  private prisma: PrismaClient;
  private redis: Redis;
  private temporalClient: TemporalClient | null = null;
  private workflowClient: WorkflowClient | null = null;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Temporal client
      this.temporalClient = new TemporalClient({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      });
      
      this.workflowClient = new WorkflowClient({
        client: this.temporalClient,
      });

      logger.info('WorkflowOrchestrator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WorkflowOrchestrator:', error);
      // Continue without Temporal for now
    }
  }

  async createWorkflow(workflow: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    logger.info('Creating new workflow', { name: workflow.name });
    
    // Store in database
    const created = await this.prisma.workflow.create({
      data: {
        name: workflow.name!,
        description: workflow.description,
        definition: JSON.stringify({
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
          triggers: workflow.triggers || [],
        }),
        status: workflow.status || 'draft',
        createdBy: workflow.createdBy!,
      },
    });

    // Cache in Redis for fast access
    await this.redis.set(
      `workflow:${created.id}`,
      JSON.stringify(created),
      'EX',
      3600 // 1 hour cache
    );

    return this.deserializeWorkflow(created);
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    logger.info('Updating workflow', { id });
    
    const updated = await this.prisma.workflow.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        definition: updates.nodes ? JSON.stringify({
          nodes: updates.nodes,
          edges: updates.edges,
          triggers: updates.triggers,
        }) : undefined,
        status: updates.status,
      },
    });

    // Update cache
    await this.redis.set(
      `workflow:${id}`,
      JSON.stringify(updated),
      'EX',
      3600
    );

    return this.deserializeWorkflow(updated);
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    // Check cache first
    const cached = await this.redis.get(`workflow:${id}`);
    if (cached) {
      return this.deserializeWorkflow(JSON.parse(cached));
    }

    // Fetch from database
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return null;
    }

    // Update cache
    await this.redis.set(
      `workflow:${id}`,
      JSON.stringify(workflow),
      'EX',
      3600
    );

    return this.deserializeWorkflow(workflow);
  }

  async executeWorkflow(
    workflowId: string,
    input: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    logger.info('Executing workflow', { workflowId, input });
    
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId,
        status: 'pending',
        input: JSON.stringify(input),
        startTime: new Date(),
      },
    });

    // Execute using Temporal if available
    if (this.workflowClient) {
      try {
        const handle = await this.workflowClient.start('executeWorkflow', {
          taskQueue: 'velocitymesh-workflows',
          workflowId: execution.id,
          args: [workflow, input],
        });

        // Store handle for monitoring
        await this.redis.set(
          `execution:${execution.id}`,
          handle.workflowId,
          'EX',
          86400 // 24 hours
        );

        // Update status
        await this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: { status: 'running' },
        });
      } catch (error) {
        logger.error('Failed to execute workflow with Temporal:', error);
        // Fall back to local execution
        await this.executeLocally(workflow, execution, input);
      }
    } else {
      // Execute locally without Temporal
      await this.executeLocally(workflow, execution, input);
    }

    return this.deserializeExecution(execution);
  }

  private async executeLocally(
    workflow: WorkflowDefinition,
    execution: any,
    input: Record<string, any>
  ): Promise<void> {
    logger.info('Executing workflow locally', { workflowId: workflow.id });
    
    try {
      const startTime = Date.now();
      const executionPath: string[] = [];
      let currentData = { ...input };

      // Simple linear execution for now
      for (const node of workflow.nodes) {
        executionPath.push(node.id);
        
        // Execute node based on type
        switch (node.type) {
          case 'action':
            currentData = await this.executeActionNode(node, currentData);
            break;
          case 'condition':
            // Implement condition logic
            break;
          case 'loop':
            // Implement loop logic
            break;
          case 'ai_assistant':
            // Implement AI assistant logic
            break;
        }
      }

      const duration = Date.now() - startTime;

      // Update execution record
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          endTime: new Date(),
          output: JSON.stringify(currentData),
          executionPath: JSON.stringify(executionPath),
          metrics: JSON.stringify({
            duration,
            nodesExecuted: executionPath.length,
            computeTimeMs: duration,
          }),
        },
      });

      logger.info('Workflow executed successfully', {
        workflowId: workflow.id,
        executionId: execution.id,
        duration,
      });
    } catch (error: any) {
      logger.error('Workflow execution failed', {
        workflowId: workflow.id,
        executionId: execution.id,
        error: error.message,
      });

      // Update execution record with error
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          endTime: new Date(),
          error: error.message,
        },
      });

      throw error;
    }
  }

  private async executeActionNode(
    node: WorkflowNode,
    input: Record<string, any>
  ): Promise<Record<string, any>> {
    logger.debug('Executing action node', { nodeId: node.id, type: node.data.config.actionType });
    
    // Simulate action execution
    // In a real implementation, this would call the appropriate integration
    switch (node.data.config.actionType) {
      case 'http_request':
        // Make HTTP request
        return { ...input, httpResponse: 'simulated response' };
      case 'database_query':
        // Execute database query
        return { ...input, queryResult: [] };
      case 'send_email':
        // Send email
        return { ...input, emailSent: true };
      default:
        return input;
    }
  }

  async getExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const executions = await this.prisma.workflowExecution.findMany({
      where: workflowId ? { workflowId } : undefined,
      orderBy: { startTime: 'desc' },
      take: 100,
    });

    return executions.map(this.deserializeExecution);
  }

  async cancelExecution(executionId: string): Promise<void> {
    logger.info('Cancelling execution', { executionId });
    
    // Get Temporal handle if available
    const workflowId = await this.redis.get(`execution:${executionId}`);
    if (workflowId && this.workflowClient) {
      try {
        const handle = this.workflowClient.getHandle(workflowId);
        await handle.cancel();
      } catch (error) {
        logger.error('Failed to cancel Temporal workflow:', error);
      }
    }

    // Update status
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'cancelled',
        endTime: new Date(),
      },
    });
  }

  private deserializeWorkflow(data: any): WorkflowDefinition {
    const definition = JSON.parse(data.definition || '{}');
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      nodes: definition.nodes || [],
      edges: definition.edges || [],
      triggers: definition.triggers || [],
      createdBy: data.createdBy,
      updatedAt: data.updatedAt,
      status: data.status,
    };
  }

  private deserializeExecution(data: any): WorkflowExecution {
    return {
      id: data.id,
      workflowId: data.workflowId,
      status: data.status,
      startTime: data.startTime,
      endTime: data.endTime,
      input: JSON.parse(data.input || '{}'),
      output: data.output ? JSON.parse(data.output) : undefined,
      error: data.error,
      executionPath: data.executionPath ? JSON.parse(data.executionPath) : [],
      metrics: data.metrics ? JSON.parse(data.metrics) : {
        nodesExecuted: 0,
        computeTimeMs: 0,
      },
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down WorkflowOrchestrator');
    if (this.temporalClient) {
      await this.temporalClient.connection.close();
    }
  }
}