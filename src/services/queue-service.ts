import { Queue, Worker, QueueEvents } from 'bullmq';
import { LogService } from './log-service';
import IORedis from 'ioredis';

export interface MessageJob {
    instanceId: string;
    to: string;
    message: string;
    mediaUrl?: string;
    tenantId: string;
}

export interface BroadcastJob {
    instanceId: string;
    recipients: string[];
    message: string;
    tenantId: string;
}

export class QueueService {
    private messageQueue: Queue;
    private broadcastQueue: Queue;
    private connection: IORedis;
    private logger: LogService;
    private messageWorker?: Worker;
    private broadcastWorker?: Worker;

    constructor(logger: LogService) {
        this.logger = logger;

        // Configuração do Redis
        const redisHost = process.env.REDIS_HOST || 'localhost';
        const redisPort = parseInt(process.env.REDIS_PORT || '6379');
        const redisPassword = process.env.REDIS_PASSWORD;

        this.connection = new IORedis({
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            maxRetriesPerRequest: null,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        // Criar filas
        this.messageQueue = new Queue('messages', { connection: this.connection });
        this.broadcastQueue = new Queue('broadcasts', { connection: this.connection });

        this.logger.info('QueueService inicializado com Redis', { host: redisHost, port: redisPort });
    }

    /**
     * Adiciona uma mensagem individual na fila
     */
    async addMessage(job: MessageJob, priority: number = 5): Promise<string> {
        const result = await this.messageQueue.add('send-message', job, {
            priority,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        });

        this.logger.info('Mensagem adicionada à fila', { jobId: result.id, to: job.to });
        return result.id!;
    }

    /**
     * Adiciona um broadcast (envio em massa) na fila
     */
    async addBroadcast(job: BroadcastJob): Promise<string> {
        const result = await this.broadcastQueue.add('send-broadcast', job, {
            attempts: 2,
            backoff: {
                type: 'fixed',
                delay: 5000
            }
        });

        this.logger.info('Broadcast adicionado à fila', {
            jobId: result.id,
            recipients: job.recipients.length
        });
        return result.id!;
    }

    /**
     * Inicia os workers para processar as filas
     */
    startWorkers(messageHandler: (job: MessageJob) => Promise<void>, broadcastHandler: (job: BroadcastJob) => Promise<void>) {
        // Worker para mensagens individuais
        this.messageWorker = new Worker('messages', async (job) => {
            this.logger.info('Processando mensagem da fila', { jobId: job.id });
            await messageHandler(job.data);
        }, {
            connection: this.connection,
            concurrency: 10, // Processa até 10 mensagens simultaneamente
            limiter: {
                max: 20, // Máximo de 20 jobs por segundo
                duration: 1000
            }
        });

        // Worker para broadcasts
        this.broadcastWorker = new Worker('broadcasts', async (job) => {
            this.logger.info('Processando broadcast da fila', { jobId: job.id });
            await broadcastHandler(job.data);
        }, {
            connection: this.connection,
            concurrency: 2 // Broadcasts são mais pesados, limita a 2 simultâneos
        });

        // Event listeners
        this.messageWorker.on('completed', (job) => {
            this.logger.info('Mensagem processada com sucesso', { jobId: job.id });
        });

        this.messageWorker.on('failed', (job, err) => {
            this.logger.error(`Erro ao processar mensagem (Job: ${job?.id})`, err as Error);
        });

        this.broadcastWorker.on('completed', (job) => {
            this.logger.info('Broadcast processado com sucesso', { jobId: job.id });
        });

        this.broadcastWorker.on('failed', (job, err) => {
            this.logger.error(`Erro ao processar broadcast (Job: ${job?.id})`, err as Error);
        });

        this.logger.info('Workers de fila iniciados');
    }

    /**
     * Para os workers e fecha as conexões
     */
    async close(): Promise<void> {
        if (this.messageWorker) await this.messageWorker.close();
        if (this.broadcastWorker) await this.broadcastWorker.close();
        await this.messageQueue.close();
        await this.broadcastQueue.close();
        await this.connection.quit();
        this.logger.info('QueueService encerrado');
    }

    /**
     * Retorna estatísticas das filas
     */
    async getStats() {
        const messageStats = await this.messageQueue.getJobCounts();
        const broadcastStats = await this.broadcastQueue.getJobCounts();

        return {
            messages: messageStats,
            broadcasts: broadcastStats
        };
    }
}
