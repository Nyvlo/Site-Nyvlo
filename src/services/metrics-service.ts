import { LogService } from './log-service';

export interface Metrics {
  messagesReceived: number;
  messagesProcessed: number;
  aiResponses: number;
  humanTransfers: number;
  errors: number;
  activeUsers: number;
  responseTime: number[];
  uptime: number;
}

export class MetricsService {
  private metrics: Metrics;
  private logger: LogService;
  private startTime: number;

  constructor(logger: LogService) {
    this.logger = logger;
    this.startTime = Date.now();
    this.metrics = {
      messagesReceived: 0,
      messagesProcessed: 0,
      aiResponses: 0,
      humanTransfers: 0,
      errors: 0,
      activeUsers: 0,
      responseTime: [],
      uptime: 0
    };
  }

  incrementMessageReceived(): void {
    this.metrics.messagesReceived++;
  }

  incrementMessageProcessed(): void {
    this.metrics.messagesProcessed++;
  }

  incrementAIResponse(): void {
    this.metrics.aiResponses++;
  }

  incrementHumanTransfer(): void {
    this.metrics.humanTransfers++;
  }

  incrementError(): void {
    this.metrics.errors++;
  }

  recordResponseTime(timeMs: number): void {
    this.metrics.responseTime.push(timeMs);
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }

  setActiveUsers(count: number): void {
    this.metrics.activeUsers = count;
  }

  getMetrics(): Metrics {
    this.metrics.uptime = Date.now() - this.startTime;
    return { ...this.metrics };
  }

  getAverageResponseTime(): number {
    if (this.metrics.responseTime.length === 0) return 0;
    return this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length;
  }

  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, unknown> } {
    const avgResponseTime = this.getAverageResponseTime();
    const errorRate = this.metrics.errors / Math.max(this.metrics.messagesProcessed, 1);
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (avgResponseTime > 5000 || errorRate > 0.1) {
      status = 'degraded';
    }
    
    if (avgResponseTime > 10000 || errorRate > 0.2) {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        averageResponseTime: avgResponseTime,
        errorRate: errorRate,
        uptime: this.metrics.uptime,
        messagesPerMinute: this.metrics.messagesReceived / (this.metrics.uptime / 60000)
      }
    };
  }

  logMetrics(): void {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    this.logger.info('Métricas do sistema', {
      ...metrics,
      averageResponseTime: this.getAverageResponseTime(),
      health: health.status
    });
  }

  startPeriodicLogging(intervalMs: number = 300000): void { // 5 minutes
    setInterval(() => {
      this.logMetrics();
    }, intervalMs);
  }
}