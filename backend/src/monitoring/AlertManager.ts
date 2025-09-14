import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { metricsCollector } from './MetricsCollector';

/**
 * Intelligent Alert Management System
 * Implements smart alerting with deduplication, escalation, and multiple channels
 */

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  component: string;
  metrics?: Record<string, number>;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  escalationLevel: number;
  lastEscalated?: Date;
  resolvedAt?: Date;
}

interface AlertRule {
  id: string;
  name: string;
  component: string;
  condition: (metrics: any) => boolean;
  severity: Alert['severity'];
  description: string;
  cooldownMs: number;
  escalationIntervalMs: number;
  maxEscalations: number;
}

interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
  severityThreshold: Alert['severity'];
}

export class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private alertRules: AlertRule[] = [];
  private notificationChannels: NotificationChannel[] = [];
  private cooldownMap: Map<string, Date> = new Map();
  private emailTransporter?: nodemailer.Transporter;

  constructor() {
    this.setupEmailTransporter();
    this.initializeDefaultRules();
  }

  private setupEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  private initializeDefaultRules() {
    this.alertRules = [
      // System Health Rules
      {
        id: 'database_down',
        name: 'Database Connection Failed',
        component: 'database',
        condition: (metrics) => !metrics.databaseHealthy,
        severity: 'critical',
        description: 'Database connection is down or severely degraded',
        cooldownMs: 5 * 60 * 1000, // 5 minutes
        escalationIntervalMs: 15 * 60 * 1000, // 15 minutes
        maxEscalations: 3
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate Detected',
        component: 'api',
        condition: (metrics) => metrics.errorRate > 5, // 5% error rate
        severity: 'high',
        description: 'Error rate is above acceptable threshold',
        cooldownMs: 10 * 60 * 1000,
        escalationIntervalMs: 30 * 60 * 1000,
        maxEscalations: 2
      },
      {
        id: 'memory_usage_high',
        name: 'High Memory Usage',
        component: 'system',
        condition: (metrics) => metrics.memoryUsagePercent > 85,
        severity: 'medium',
        description: 'Memory usage is critically high',
        cooldownMs: 15 * 60 * 1000,
        escalationIntervalMs: 60 * 60 * 1000,
        maxEscalations: 2
      },
      {
        id: 'workflow_failures',
        name: 'Workflow Failure Spike',
        component: 'workflow_engine',
        condition: (metrics) => metrics.workflowFailureRate > 10,
        severity: 'high',
        description: 'Workflow failure rate is unusually high',
        cooldownMs: 5 * 60 * 1000,
        escalationIntervalMs: 20 * 60 * 1000,
        maxEscalations: 3
      },
      {
        id: 'ai_service_latency',
        name: 'AI Service High Latency',
        component: 'ai_services',
        condition: (metrics) => metrics.aiAverageLatency > 30,
        severity: 'medium',
        description: 'AI service response time is degraded',
        cooldownMs: 20 * 60 * 1000,
        escalationIntervalMs: 60 * 60 * 1000,
        maxEscalations: 1
      },
      // Business Rules
      {
        id: 'subscription_failures',
        name: 'Payment Processing Issues',
        component: 'billing',
        condition: (metrics) => metrics.paymentFailureRate > 15,
        severity: 'high',
        description: 'High rate of payment processing failures detected',
        cooldownMs: 15 * 60 * 1000,
        escalationIntervalMs: 30 * 60 * 1000,
        maxEscalations: 2
      },
      {
        id: 'user_experience_degraded',
        name: 'User Experience Degradation',
        component: 'frontend',
        condition: (metrics) => metrics.avgCognitiveLoadScore > 80,
        severity: 'medium',
        description: 'User cognitive load scores indicate poor experience',
        cooldownMs: 30 * 60 * 1000,
        escalationIntervalMs: 120 * 60 * 1000,
        maxEscalations: 1
      }
    ];

    logger.info('Alert rules initialized', { ruleCount: this.alertRules.length });
  }

  public addNotificationChannel(channel: NotificationChannel) {
    this.notificationChannels.push(channel);
    logger.info('Notification channel added', { type: channel.type });
  }

  public async evaluateAlerts(systemMetrics: any): Promise<void> {
    for (const rule of this.alertRules) {
      try {
        const shouldAlert = rule.condition(systemMetrics);
        const alertId = `${rule.component}_${rule.id}`;

        if (shouldAlert) {
          await this.triggerAlert(alertId, rule, systemMetrics);
        } else {
          // Auto-resolve alert if condition is no longer met
          const existingAlert = this.alerts.get(alertId);
          if (existingAlert && existingAlert.status === 'active') {
            await this.resolveAlert(alertId, 'Condition no longer met');
          }
        }
      } catch (error) {
        logger.error('Error evaluating alert rule', { rule: rule.id, error });
      }
    }

    // Check for escalations
    await this.checkEscalations();
  }

  private async triggerAlert(alertId: string, rule: AlertRule, metrics: any): Promise<void> {
    const now = new Date();
    const cooldownKey = `${rule.component}_${rule.id}`;
    const lastCooldown = this.cooldownMap.get(cooldownKey);

    // Check cooldown period
    if (lastCooldown && (now.getTime() - lastCooldown.getTime()) < rule.cooldownMs) {
      return;
    }

    const existingAlert = this.alerts.get(alertId);

    if (!existingAlert) {
      // Create new alert
      const alert: Alert = {
        id: alertId,
        severity: rule.severity,
        title: rule.name,
        description: rule.description,
        component: rule.component,
        metrics: this.extractRelevantMetrics(metrics, rule.component),
        timestamp: now,
        status: 'active',
        escalationLevel: 0
      };

      this.alerts.set(alertId, alert);
      await this.sendNotification(alert);
      this.cooldownMap.set(cooldownKey, now);

      // Track alert in metrics
      metricsCollector.trackError('alert', rule.component, rule.severity);

      logger.warn('Alert triggered', {
        alertId,
        rule: rule.name,
        severity: rule.severity,
        component: rule.component
      });
    }
  }

  private async checkEscalations(): Promise<void> {
    const now = new Date();

    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.status !== 'active') continue;

      const rule = this.alertRules.find(r => `${r.component}_${r.id}` === alertId);
      if (!rule) continue;

      const timeSinceLastEscalation = alert.lastEscalated ? 
        now.getTime() - alert.lastEscalated.getTime() :
        now.getTime() - alert.timestamp.getTime();

      if (timeSinceLastEscalation >= rule.escalationIntervalMs && 
          alert.escalationLevel < rule.maxEscalations) {
        
        alert.escalationLevel += 1;
        alert.lastEscalated = now;
        
        await this.sendEscalationNotification(alert, rule);
        
        logger.warn('Alert escalated', {
          alertId,
          escalationLevel: alert.escalationLevel,
          maxEscalations: rule.maxEscalations
        });
      }
    }
  }

  public async resolveAlert(alertId: string, reason?: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    await this.sendResolutionNotification(alert, reason);

    logger.info('Alert resolved', { alertId, reason });
  }

  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    alert.status = 'acknowledged';

    logger.info('Alert acknowledged', { alertId, acknowledgedBy });
  }

  private async sendNotification(alert: Alert): Promise<void> {
    const applicableChannels = this.notificationChannels.filter(
      channel => channel.enabled && this.shouldNotifyChannel(channel, alert.severity)
    );

    for (const channel of applicableChannels) {
      try {
        await this.sendToChannel(channel, alert, 'alert');
      } catch (error) {
        logger.error('Failed to send notification', { channel: channel.type, error });
      }
    }
  }

  private async sendEscalationNotification(alert: Alert, rule: AlertRule): Promise<void> {
    const escalationChannels = this.notificationChannels.filter(
      channel => channel.enabled && 
      this.shouldNotifyChannel(channel, alert.severity) &&
      alert.escalationLevel > 0
    );

    for (const channel of escalationChannels) {
      try {
        await this.sendToChannel(channel, alert, 'escalation');
      } catch (error) {
        logger.error('Failed to send escalation notification', { channel: channel.type, error });
      }
    }
  }

  private async sendResolutionNotification(alert: Alert, reason?: string): Promise<void> {
    const channels = this.notificationChannels.filter(
      channel => channel.enabled
    );

    for (const channel of channels) {
      try {
        await this.sendToChannel(channel, alert, 'resolution', reason);
      } catch (error) {
        logger.error('Failed to send resolution notification', { channel: channel.type, error });
      }
    }
  }

  private async sendToChannel(
    channel: NotificationChannel, 
    alert: Alert, 
    type: 'alert' | 'escalation' | 'resolution',
    reason?: string
  ): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, alert, type, reason);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert, type, reason);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, alert, type, reason);
        break;
      default:
        logger.warn('Unknown notification channel type', { type: channel.type });
    }
  }

  private async sendEmailNotification(
    channel: NotificationChannel, 
    alert: Alert, 
    type: string,
    reason?: string
  ): Promise<void> {
    if (!this.emailTransporter) return;

    const subject = type === 'resolution' ? 
      `[RESOLVED] ${alert.title}` :
      type === 'escalation' ? 
      `[ESCALATION ${alert.escalationLevel}] ${alert.title}` :
      `[${alert.severity.toUpperCase()}] ${alert.title}`;

    const htmlContent = this.generateEmailHTML(alert, type, reason);

    await this.emailTransporter.sendMail({
      from: channel.config.from || process.env.SMTP_USER,
      to: channel.config.to,
      subject,
      html: htmlContent
    });
  }

  private async sendSlackNotification(
    channel: NotificationChannel, 
    alert: Alert, 
    type: string,
    reason?: string
  ): Promise<void> {
    const color = this.getSeverityColor(alert.severity);
    const icon = type === 'resolution' ? '✅' : 
                type === 'escalation' ? '🚨' : '⚠️';

    const payload = {
      text: `${icon} ${alert.title}`,
      attachments: [{
        color,
        fields: [
          {
            title: 'Component',
            value: alert.component,
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Description',
            value: alert.description,
            short: false
          },
          ...(reason ? [{
            title: 'Resolution',
            value: reason,
            short: false
          }] : [])
        ],
        timestamp: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }
  }

  private async sendWebhookNotification(
    channel: NotificationChannel, 
    alert: Alert, 
    type: string,
    reason?: string
  ): Promise<void> {
    const payload = {
      alert,
      type,
      reason,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...channel.config.headers || {}
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`);
    }
  }

  private shouldNotifyChannel(channel: NotificationChannel, severity: Alert['severity']): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityLevels[severity] >= severityLevels[channel.severityThreshold];
  }

  private getSeverityColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffaa00';
      case 'low': return '#00aa00';
      default: return '#808080';
    }
  }

  private extractRelevantMetrics(metrics: any, component: string): Record<string, number> {
    // Extract component-specific metrics
    const relevant: Record<string, number> = {};
    
    if (component === 'database') {
      relevant.connections = metrics.databaseConnections || 0;
      relevant.latency = metrics.databaseLatency || 0;
    } else if (component === 'api') {
      relevant.errorRate = metrics.errorRate || 0;
      relevant.requestsPerSecond = metrics.requestsPerSecond || 0;
    } else if (component === 'system') {
      relevant.memoryUsage = metrics.memoryUsagePercent || 0;
      relevant.cpuUsage = metrics.cpuUsagePercent || 0;
    }

    return relevant;
  }

  private generateEmailHTML(alert: Alert, type: string, reason?: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; text-align: center;">
          <h1>${type === 'resolution' ? '✅ RESOLVED' : type === 'escalation' ? '🚨 ESCALATED' : '⚠️ ALERT'}</h1>
          <h2>${alert.title}</h2>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Component:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.component}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Severity:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.severity.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Timestamp:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.timestamp.toISOString()}</td>
            </tr>
            ${alert.escalationLevel > 0 ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Escalation Level:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.escalationLevel}</td>
            </tr>
            ` : ''}
          </table>
          
          <div style="margin-top: 20px;">
            <h3>Description:</h3>
            <p>${alert.description}</p>
          </div>
          
          ${reason ? `
          <div style="margin-top: 20px; padding: 15px; background-color: #e8f5e8; border-left: 4px solid #4caf50;">
            <h3>Resolution:</h3>
            <p>${reason}</p>
          </div>
          ` : ''}
          
          ${alert.metrics && Object.keys(alert.metrics).length > 0 ? `
          <div style="margin-top: 20px;">
            <h3>Metrics:</h3>
            <ul>
              ${Object.entries(alert.metrics).map(([key, value]) => 
                `<li><strong>${key}:</strong> ${value}</li>`
              ).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
        
        <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          VelocityMesh Alert System | ${new Date().toISOString()}
        </div>
      </div>
    `;
  }

  // Public API methods
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  public getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  public getAlertsByComponent(component: string): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.component === component);
  }
}

export default AlertManager;