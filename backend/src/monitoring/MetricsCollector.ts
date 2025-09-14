import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../utils/logger';

/**
 * Comprehensive Metrics Collection System
 * Implements monitoring and observability for VelocityMesh platform
 */

export class MetricsCollector {
  // Business Metrics
  public readonly workflowExecutions = new Counter({
    name: 'velocitymesh_workflow_executions_total',
    help: 'Total number of workflow executions',
    labelNames: ['status', 'workflow_type', 'user_id']
  });

  public readonly workflowExecutionDuration = new Histogram({
    name: 'velocitymesh_workflow_execution_duration_seconds',
    help: 'Workflow execution duration in seconds',
    labelNames: ['workflow_type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300]
  });

  public readonly activeWorkflows = new Gauge({
    name: 'velocitymesh_active_workflows',
    help: 'Number of currently active workflows',
    labelNames: ['user_id']
  });

  // Integration Metrics
  public readonly integrationCalls = new Counter({
    name: 'velocitymesh_integration_calls_total',
    help: 'Total number of integration API calls',
    labelNames: ['integration_type', 'status', 'endpoint']
  });

  public readonly integrationLatency = new Histogram({
    name: 'velocitymesh_integration_latency_seconds',
    help: 'Integration API call latency',
    labelNames: ['integration_type', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
  });

  // User Experience Metrics
  public readonly userSessions = new Counter({
    name: 'velocitymesh_user_sessions_total',
    help: 'Total number of user sessions',
    labelNames: ['user_type', 'experience_level']
  });

  public readonly cognitiveLoadScore = new Histogram({
    name: 'velocitymesh_cognitive_load_score',
    help: 'User cognitive load scores',
    labelNames: ['user_id', 'workflow_complexity'],
    buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  });

  // AI Metrics
  public readonly aiRequests = new Counter({
    name: 'velocitymesh_ai_requests_total',
    help: 'Total number of AI requests',
    labelNames: ['request_type', 'model', 'status']
  });

  public readonly aiLatency = new Histogram({
    name: 'velocitymesh_ai_latency_seconds',
    help: 'AI request latency',
    labelNames: ['request_type', 'model'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60]
  });

  // System Metrics
  public readonly httpRequests = new Counter({
    name: 'velocitymesh_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });

  public readonly httpDuration = new Histogram({
    name: 'velocitymesh_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  });

  public readonly databaseConnections = new Gauge({
    name: 'velocitymesh_database_connections',
    help: 'Number of database connections',
    labelNames: ['database', 'state']
  });

  public readonly queueSize = new Gauge({
    name: 'velocitymesh_queue_size',
    help: 'Number of items in processing queues',
    labelNames: ['queue_name', 'status']
  });

  // Error Tracking
  public readonly errors = new Counter({
    name: 'velocitymesh_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'component', 'severity']
  });

  // Business Intelligence Metrics
  public readonly subscriptionEvents = new Counter({
    name: 'velocitymesh_subscription_events_total',
    help: 'Subscription lifecycle events',
    labelNames: ['event_type', 'plan', 'user_type']
  });

  public readonly computeUsage = new Counter({
    name: 'velocitymesh_compute_usage_seconds',
    help: 'Total compute usage in seconds',
    labelNames: ['user_id', 'plan', 'workflow_type']
  });

  public readonly revenueMetrics = new Gauge({
    name: 'velocitymesh_revenue_usd',
    help: 'Revenue metrics in USD',
    labelNames: ['metric_type', 'plan', 'period']
  });

  private static instance: MetricsCollector;

  constructor() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      register,
      prefix: 'velocitymesh_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });

    logger.info('MetricsCollector initialized with comprehensive monitoring');
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // Business Logic Tracking Methods
  public trackWorkflowExecution(
    status: 'success' | 'failed' | 'timeout' | 'cancelled',
    workflowType: string,
    userId: string,
    duration?: number
  ) {
    this.workflowExecutions.inc({ status, workflow_type: workflowType, user_id: userId });
    
    if (duration !== undefined) {
      this.workflowExecutionDuration
        .labels({ workflow_type: workflowType, status })
        .observe(duration);
    }
  }

  public updateActiveWorkflows(userId: string, count: number) {
    this.activeWorkflows.set({ user_id: userId }, count);
  }

  public trackIntegrationCall(
    integrationType: string,
    endpoint: string,
    status: 'success' | 'error' | 'timeout',
    latency: number
  ) {
    this.integrationCalls.inc({ 
      integration_type: integrationType, 
      status, 
      endpoint 
    });
    
    this.integrationLatency
      .labels({ integration_type: integrationType, endpoint })
      .observe(latency);
  }

  public trackUserSession(userType: 'free' | 'paid' | 'enterprise', experienceLevel: string) {
    this.userSessions.inc({ user_type: userType, experience_level: experienceLevel });
  }

  public trackCognitiveLoad(userId: string, workflowComplexity: string, score: number) {
    this.cognitiveLoadScore
      .labels({ user_id: userId, workflow_complexity: workflowComplexity })
      .observe(score);
  }

  public trackAIRequest(
    requestType: 'workflow_generation' | 'suggestion' | 'optimization' | 'explanation',
    model: string,
    status: 'success' | 'error' | 'timeout',
    latency: number
  ) {
    this.aiRequests.inc({ request_type: requestType, model, status });
    this.aiLatency
      .labels({ request_type: requestType, model })
      .observe(latency);
  }

  public trackHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ) {
    this.httpRequests.inc({ 
      method, 
      route, 
      status_code: statusCode.toString() 
    });
    
    this.httpDuration
      .labels({ method, route, status_code: statusCode.toString() })
      .observe(duration);
  }

  public updateDatabaseConnections(database: string, state: 'active' | 'idle' | 'waiting', count: number) {
    this.databaseConnections.set({ database, state }, count);
  }

  public updateQueueSize(queueName: string, status: 'pending' | 'processing' | 'completed' | 'failed', size: number) {
    this.queueSize.set({ queue_name: queueName, status }, size);
  }

  public trackError(
    type: 'validation' | 'business' | 'system' | 'integration' | 'ai',
    component: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    this.errors.inc({ type, component, severity });
  }

  public trackSubscriptionEvent(
    eventType: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed',
    plan: string,
    userType: string
  ) {
    this.subscriptionEvents.inc({ event_type: eventType, plan, user_type: userType });
  }

  public trackComputeUsage(userId: string, plan: string, workflowType: string, seconds: number) {
    this.computeUsage.inc({ user_id: userId, plan, workflow_type: workflowType }, seconds);
  }

  public updateRevenue(
    metricType: 'mrr' | 'arr' | 'churn' | 'ltv',
    plan: string,
    period: 'monthly' | 'annual',
    value: number
  ) {
    this.revenueMetrics.set({ metric_type: metricType, plan, period }, value);
  }

  // Utility Methods
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  public getRegister() {
    return register;
  }

  public reset() {
    register.clear();
    logger.info('Metrics registry cleared');
  }

  // Health Check Methods
  public getHealthMetrics() {
    return {
      totalWorkflowExecutions: this.workflowExecutions,
      totalIntegrationCalls: this.integrationCalls,
      totalUserSessions: this.userSessions,
      totalAiRequests: this.aiRequests,
      totalHttpRequests: this.httpRequests,
      totalErrors: this.errors
    };
  }

  // Dashboard Metrics Aggregation
  public async getDashboardMetrics(userId?: string) {
    const metrics = await this.getMetrics();
    
    // Parse metrics for dashboard display
    // This would typically integrate with a time-series database
    return {
      workflowExecutions: {
        total: 0, // Parse from metrics
        successful: 0,
        failed: 0,
        avgDuration: 0
      },
      integrations: {
        totalCalls: 0,
        avgLatency: 0,
        errorRate: 0
      },
      userExperience: {
        avgCognitiveLoad: 0,
        sessionDuration: 0,
        bounceRate: 0
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
  }
}

export const metricsCollector = MetricsCollector.getInstance();