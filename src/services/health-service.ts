import { DatabaseService } from './database-service';
import { LogService } from './log-service';
import { AIService } from './ai-service';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
}

export class HealthService {
  private logger: LogService;
  private database: DatabaseService;
  private aiService?: AIService;
  private startTime: number;

  constructor(logger: LogService, database: DatabaseService, aiService?: AIService) {
    this.logger = logger;
    this.database = database;
    this.aiService = aiService;
    this.startTime = Date.now();
  }

  async checkHealth(): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];

    // Database health check
    checks.push(await this.checkDatabase());

    // AI service health check
    if (this.aiService) {
      checks.push(await this.checkAI());
    }

    // Memory health check
    checks.push(this.checkMemory());

    // Disk space health check
    checks.push(await this.checkDiskSpace());

    // WhatsApp connection health check
    checks.push(this.checkWhatsAppConnection());

    // Determine overall status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasDegraded = checks.some(check => check.status === 'degraded');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      const result = await this.database.get<{ test: number }>('SELECT 1 as test');

      if (result && result.test === 1) {
        return {
          name: 'database',
          status: 'healthy',
          message: 'Database connection is working',
          responseTime: Date.now() - start
        };
      } else {
        return {
          name: 'database',
          status: 'unhealthy',
          message: 'Database query returned unexpected result',
          responseTime: Date.now() - start
        };
      }
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: `Database connection failed: ${(error as Error).message}`,
        responseTime: Date.now() - start
      };
    }
  }

  private async checkAI(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      if (!this.aiService?.isEnabled()) {
        return {
          name: 'ai',
          status: 'healthy',
          message: 'AI service is disabled',
          responseTime: Date.now() - start
        };
      }

      // Simple test message
      const response = await this.aiService.processMessage('test', []);

      if (response.message) {
        return {
          name: 'ai',
          status: 'healthy',
          message: 'AI service is responding',
          responseTime: Date.now() - start,
          details: { confidence: response.confidence }
        };
      } else {
        return {
          name: 'ai',
          status: 'degraded',
          message: 'AI service returned empty response',
          responseTime: Date.now() - start
        };
      }
    } catch (error) {
      return {
        name: 'ai',
        status: 'unhealthy',
        message: `AI service failed: ${(error as Error).message}`,
        responseTime: Date.now() - start
      };
    }
  }

  private checkMemory(): HealthCheck {
    const memUsage = process.memoryUsage();
    const totalMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `Memory usage: ${totalMB}MB RSS, ${heapUsedMB}MB/${heapTotalMB}MB heap`;

    if (totalMB > 1000) { // 1GB
      status = 'degraded';
      message += ' (high memory usage)';
    }

    if (totalMB > 2000) { // 2GB
      status = 'unhealthy';
      message += ' (critical memory usage)';
    }

    return {
      name: 'memory',
      status,
      message,
      details: {
        rss: totalMB,
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        external: Math.round(memUsage.external / 1024 / 1024)
      }
    };
  }

  private async checkDiskSpace(): Promise<HealthCheck> {
    try {
      const fs = await import('fs');
      const stats = fs.statSync('.');

      // This is a simplified check - in production you'd want to check actual disk space
      return {
        name: 'disk',
        status: 'healthy',
        message: 'Disk space check passed',
        details: {
          note: 'Simplified disk check - implement proper disk space monitoring for production'
        }
      };
    } catch (error) {
      return {
        name: 'disk',
        status: 'unhealthy',
        message: `Disk check failed: ${(error as Error).message}`
      };
    }
  }

  private checkWhatsAppConnection(): HealthCheck {
    // This would need to be integrated with the actual WhatsApp adapter
    // For now, we'll return a basic check
    return {
      name: 'whatsapp',
      status: 'healthy',
      message: 'WhatsApp connection status check (implement with adapter)',
      details: {
        note: 'Integrate with BaileysAdapter for actual connection status'
      }
    };
  }

  async logHealth(): Promise<void> {
    const health = await this.checkHealth();
    this.logger.info('System health check', health);
  }

  startPeriodicHealthCheck(intervalMs: number = 300000): void { // 5 minutes
    setInterval(async () => {
      await this.logHealth();
    }, intervalMs);
  }
}