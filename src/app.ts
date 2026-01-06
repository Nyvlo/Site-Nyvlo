import { BotConfig } from './types/config';
import { LogService } from './services/log-service';
import { DatabaseService } from './services/database-service';
import { BaileysAdapter } from './adapters/baileys-adapter';
import { StateManager } from './core/state-manager';
import { MessageHandler } from './core/message-handler';
import { AdminServer } from './admin/server';
import { MetricsService } from './services/metrics-service';
import { CacheService } from './services/cache-service';
import { RateLimiter } from './services/rate-limiter';
import { HealthService } from './services/health-service';
import { BackupService } from './services/backup-service';
import { WhatsAppManager } from './services/whatsapp-manager';
import { TenantConfigService } from './services/tenant-config-service';
import { WebhookService } from './services/webhook-service';
import { PaymentService } from './services/payment-service';
import { SubscriptionService } from './services/subscription-service';
import { EmailService } from './services/email-service';
import { QueueService } from './services/queue-service';
import { MonitoringService } from './services/monitoring-service';
import { ConnectionWatchdog } from './services/connection-watchdog';
import { EncryptionService } from './services/encryption-service';
import { AuditService } from './services/audit-service';
import { TwoFactorService } from './services/two-factor-service';
import { PagarmeService } from './services/pagarme-service';
import { ServiceEvaluationService } from './services/service-evaluation-service';
import { SchedulingService } from './services/scheduling-service';

export class BotApplication {
  private config: BotConfig;
  private logger: LogService;
  private database: DatabaseService | null = null;
  private adapter: BaileysAdapter | null = null;
  private stateManager: StateManager | null = null;
  private messageHandler: MessageHandler | null = null;
  private adminServer: AdminServer | null = null;
  private whatsappManager: WhatsAppManager | null = null;

  // New services
  private metricsService: MetricsService | null = null;
  private cacheService: CacheService | null = null;
  private rateLimiter: RateLimiter | null = null;
  private healthService: HealthService | null = null;
  private backupService: BackupService | null = null;
  private tenantConfigService: TenantConfigService | null = null;
  private webhookService: WebhookService | null = null;
  private paymentService: PaymentService | null = null;
  private subscriptionService: SubscriptionService | null = null;
  private emailService: EmailService | null = null;
  private queueService: QueueService | null = null;
  private monitoringService: MonitoringService | null = null;
  private connectionWatchdog: ConnectionWatchdog | null = null;
  private encryptionService: EncryptionService | null = null;
  private auditService: AuditService | null = null;
  private twoFactorService: TwoFactorService | null = null;
  private pagarmeService: PagarmeService | null = null;
  private serviceEvaluationService: ServiceEvaluationService | null = null;
  public schedulingService: SchedulingService | null = null;

  constructor(config: BotConfig, logger: LogService) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    try {
      // Initialize core services first
      await this.initializeCoreServices();

      // Initialize monitoring services
      await this.initializeMonitoringServices();

      // Start services
      await this.startServices();

      this.logger.info('Bot iniciado com sucesso!');
    } catch (error) {
      this.logger.error('Erro ao iniciar bot', error as Error);
      throw error;
    }
  }

  private async initializeCoreServices(): Promise<void> {
    // Initialize database
    this.database = new DatabaseService(this.logger);
    await this.database.initialize();

    // Initialize Audit Service
    this.auditService = new AuditService(this.database, this.logger);

    // Initialize 2FA Service
    this.twoFactorService = new TwoFactorService(this.database, this.logger);

    // Initialize state manager
    this.stateManager = new StateManager(this.database, this.config, this.logger);

    // Initialize Tenant Config Service
    this.tenantConfigService = new TenantConfigService(this.database, this.logger);
    this.schedulingService = new SchedulingService(this.database, this.logger);

    // Initialize Webhook Service
    this.webhookService = new WebhookService(this.logger);

    // Initialize Email Service
    this.emailService = new EmailService(this.logger);

    // Initialize Encryption Service
    this.encryptionService = new EncryptionService();

    // Initialize Monitoring Service (Sentry)
    this.monitoringService = new MonitoringService(this.logger);

    // Initialize Queue Service (Redis + BullMQ)
    try {
      this.queueService = new QueueService(this.logger);
      this.logger.info('QueueService inicializado com sucesso');
    } catch (error) {
      this.logger.warn('Falha ao inicializar QueueService. Sistema funcionará sem filas.', error as Error);
    }

    // Initialize Connection Watchdog
    this.connectionWatchdog = new ConnectionWatchdog(this.logger, this.database);

    // Initialize Payment Service
    this.paymentService = new PaymentService(this.database, this.logger, this.emailService);

    // Initialize Pagar.me Service
    this.pagarmeService = new PagarmeService(this.database, this.logger);

    // Initialize Subscription Service
    this.subscriptionService = new SubscriptionService(this.database, this.logger, this.emailService);

    // Initialize message handler with database, tenant service and webhook service
    this.messageHandler = new MessageHandler(
      this.stateManager,
      this.logger,
      this.database,
      this.tenantConfigService,
      this.cacheService || undefined,
      this.webhookService,
      this.paymentService,
      new SchedulingService(this.database, this.logger)
    );

    // Initialize Service Evaluation Service
    this.serviceEvaluationService = new ServiceEvaluationService(
      this.database!,
      this.logger,
      this.tenantConfigService!
    );
  }

  private async initializeMonitoringServices(): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    // Initialize metrics service
    this.metricsService = new MetricsService(this.logger);

    // Initialize cache service
    this.cacheService = new CacheService(this.logger);

    // Initialize rate limiter (10 messages per minute per user)
    this.rateLimiter = new RateLimiter(this.logger, {
      windowMs: 60000, // 1 minute
      maxRequests: 10,
      blockDurationMs: 300000 // 5 minutes block
    });

    // Initialize health service
    this.healthService = new HealthService(
      this.logger,
      this.database,
      undefined // AI service integration will be added later
    );

    // Initialize backup service
    this.backupService = new BackupService(this.database, this.logger, {
      enabled: true,
      intervalHours: 6, // Backup every 6 hours
      maxBackups: 10,
      backupPath: 'backups'
    });

    // Initialize WhatsApp Manager
    this.whatsappManager = new WhatsAppManager(this.config, this.logger, this.database);
    await this.whatsappManager.initialize();

    this.whatsappManager.setMessageHandler(async (instanceId: string, message: any) => {
      await this.handleMessage(message, instanceId);
    });

    // Update message handler with cache service
    if (this.messageHandler && this.cacheService) {
      this.messageHandler = new MessageHandler(
        this.stateManager!,
        this.logger,
        this.database!,
        this.tenantConfigService!,
        this.cacheService,
        this.webhookService || undefined,
        this.paymentService || undefined,
        this.schedulingService!
      );
    }
  }

  private async startServices(): Promise<void> {
    if (!this.database || !this.messageHandler) {
      throw new Error('Core services not initialized');
    }

    // Start admin panel
    this.adminServer = new AdminServer(this.database, this.logger);
    this.adminServer.setBotApp(this); // Pass reference to access services
    this.adminServer.start();

    // Connect WhatsApp Manager to Socket.io for real-time updates
    if (this.whatsappManager && this.adminServer) {
      this.whatsappManager.setWebMessageHandler((message) => {
        // Emit message to all connected clients in the instance room
        this.adminServer!.emitToInstance(message.instanceId, 'message:new', {
          id: `msg_${Date.now()}`,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderName: message.senderName,
          type: message.type,
          content: message.content,
          mediaUrl: message.mediaUrl,
          status: { sent: true, delivered: true, read: false },
          timestamp: message.timestamp,
          isFromMe: message.isFromMe
        });

        // Also emit conversation update
        this.adminServer!.emitToInstance(message.instanceId, 'conversation:updated', {
          conversationId: message.conversationId,
          lastMessage: {
            content: message.content,
            type: message.type,
            timestamp: message.timestamp,
            isFromMe: message.isFromMe
          }
        });
      });

      // Listen for instance status changes
      this.whatsappManager.on('instanceStatusChanged', (instance) => {
        this.adminServer!.getIO().emit('instance:status', {
          instanceId: instance.id,
          status: instance.status,
          phone: instance.phone
        });
      });

      // Listen for QR code generation
      this.whatsappManager.on('qrCodeGenerated', (data) => {
        this.adminServer!.getIO().emit('instance:qr', data);
      });
    }

    // Start monitoring services
    this.metricsService?.startPeriodicLogging();
    this.healthService?.startPeriodicHealthCheck();
    await this.backupService?.start();
    this.subscriptionService?.start();

    // Start Connection Watchdog
    if (this.connectionWatchdog) {
      this.connectionWatchdog.start();
      this.logger.info('Connection Watchdog iniciado');
    }

    // Start Service Evaluation Job (every 6 hours)
    if (this.serviceEvaluationService) {
      setInterval(() => {
        this.serviceEvaluationService?.runDailyEvaluations();
      }, 1000 * 60 * 60 * 6);

      // Run once on startup (with 5 min delay)
      setTimeout(() => {
        this.serviceEvaluationService?.runDailyEvaluations();
      }, 1000 * 60 * 5);
    }

    // Start Queue Workers (if Redis is available)
    if (this.queueService && this.whatsappManager) {
      this.queueService.startWorkers(
        // Handler para mensagens individuais
        async (job) => {
          try {
            await this.whatsappManager!.sendMessage(job.instanceId, job.to, job.message);
            this.logger.info('Mensagem da fila enviada', { to: job.to, instanceId: job.instanceId });
          } catch (error) {
            this.logger.error('Erro ao enviar mensagem da fila', error as Error);
            throw error; // Re-throw para o BullMQ fazer retry
          }
        },
        // Handler para broadcasts
        async (job) => {
          try {
            for (const recipient of job.recipients) {
              await this.whatsappManager!.sendMessage(job.instanceId, recipient, job.message);
              // Pequeno delay entre mensagens para não sobrecarregar
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            this.logger.info('Broadcast da fila enviado', {
              recipients: job.recipients.length,
              instanceId: job.instanceId
            });
          } catch (error) {
            this.logger.error('Erro ao enviar broadcast da fila', error as Error);
            throw error;
          }
        }
      );
      this.logger.info('Queue Workers iniciados');
    }

    // Auto-connect existing instances
    if (this.whatsappManager) {
      const instances = this.whatsappManager.getInstances();
      for (const instance of instances) {
        if (instance.status === 'disconnected') {
          try {
            this.logger.info(`Auto-conectando instância: ${instance.name}`);
            await this.whatsappManager.connectInstance(instance.id);
          } catch (error) {
            this.logger.error(`Erro ao auto-conectar instância ${instance.name}:`, error as Error);
          }
        }
      }
    }
  }

  private async handleMessage(message: any, instanceId?: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Increment metrics
      this.metricsService?.incrementMessageReceived();

      // Check rate limit
      if (!this.rateLimiter?.isAllowed(message.from)) {
        this.logger.warn(`Rate limit exceeded for user: ${message.from}`);
        return;
      }

      // Process message with context-aware reply function
      if (this.messageHandler) {
        await this.messageHandler.handle(message, async (to: string, msg: string) => {
          if (instanceId && this.whatsappManager) {
            await this.whatsappManager.sendMessage(instanceId, to, msg);
          }
        });
      }

      // Record metrics
      this.metricsService?.incrementMessageProcessed();
      this.metricsService?.recordResponseTime(Date.now() - startTime);

    } catch (error) {
      this.metricsService?.incrementError();
      this.logger.error('Erro ao processar mensagem', error as Error);
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Encerrando bot...');

    // Stop services in reverse order
    this.backupService?.stop();
    this.subscriptionService?.stop();

    // Stop watchdog
    if (this.connectionWatchdog) {
      this.connectionWatchdog.stop();
      this.logger.info('Connection Watchdog parado');
    }

    // Stop queue service
    if (this.queueService) {
      await this.queueService.close();
      this.logger.info('Queue Service encerrado');
    }

    // Disconnect all WhatsApp instances
    if (this.whatsappManager) {
      const instances = this.whatsappManager.getInstances();
      for (const instance of instances) {
        if (instance.status === 'connected') {
          await this.whatsappManager.disconnectInstance(instance.id);
        }
      }
    }

    // Close monitoring service (Sentry)
    if (this.monitoringService) {
      await this.monitoringService.close();
      this.logger.info('Monitoring Service encerrado');
    }

    if (this.database) {
      this.database.close();
    }

    this.logger.info('Bot encerrado');
  }

  // Getter methods for accessing services (useful for admin panel)
  getMetricsService(): MetricsService | null {
    return this.metricsService;
  }

  getCacheService(): CacheService | null {
    return this.cacheService;
  }

  getHealthService(): HealthService | null {
    return this.healthService;
  }

  getBackupService(): BackupService | null {
    return this.backupService;
  }

  getWhatsAppManager(): WhatsAppManager | null {
    return this.whatsappManager;
  }

  getPaymentService(): PaymentService | null {
    return this.paymentService;
  }

  getAuditService(): AuditService | null {
    return this.auditService;
  }

  getTwoFactorService(): TwoFactorService | null {
    return this.twoFactorService;
  }

  getServiceEvaluationService(): ServiceEvaluationService | null {
    return this.serviceEvaluationService;
  }
}
