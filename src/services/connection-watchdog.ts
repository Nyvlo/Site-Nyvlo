import { LogService } from './log-service';
import { DatabaseService } from './database-service';

export interface WatchdogConfig {
    checkInterval: number; // Intervalo de verificação em ms
    maxRetries: number; // Máximo de tentativas de reconexão
    retryDelay: number; // Delay inicial entre tentativas (ms)
    maxRetryDelay: number; // Delay máximo entre tentativas (ms)
}

export class ConnectionWatchdog {
    private logger: LogService;
    private database: DatabaseService;
    private config: WatchdogConfig;
    private checkTimer?: NodeJS.Timeout;
    private retryAttempts: Map<string, number> = new Map();
    private reconnectCallbacks: Map<string, () => Promise<void>> = new Map();

    constructor(logger: LogService, database: DatabaseService, config?: Partial<WatchdogConfig>) {
        this.logger = logger;
        this.database = database;
        this.config = {
            checkInterval: config?.checkInterval || 60000, // 1 minuto
            maxRetries: config?.maxRetries || 10,
            retryDelay: config?.retryDelay || 5000, // 5 segundos
            maxRetryDelay: config?.maxRetryDelay || 300000, // 5 minutos
        };
    }

    /**
     * Inicia o watchdog
     */
    start() {
        this.logger.info('ConnectionWatchdog iniciado', {
            checkInterval: this.config.checkInterval / 1000 + 's',
            maxRetries: this.config.maxRetries
        });

        this.checkTimer = setInterval(() => {
            this.checkConnections().catch(err => {
                this.logger.error('Erro no watchdog de conexões', err);
            });
        }, this.config.checkInterval);
    }

    /**
     * Para o watchdog
     */
    stop() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
            this.logger.info('ConnectionWatchdog parado');
        }
    }

    /**
     * Registra uma instância para monitoramento
     */
    registerInstance(instanceId: string, reconnectCallback: () => Promise<void>) {
        this.reconnectCallbacks.set(instanceId, reconnectCallback);
        this.retryAttempts.set(instanceId, 0);
        this.logger.info('Instância registrada no watchdog', { instanceId });
    }

    /**
     * Remove uma instância do monitoramento
     */
    unregisterInstance(instanceId: string) {
        this.reconnectCallbacks.delete(instanceId);
        this.retryAttempts.delete(instanceId);
        this.logger.info('Instância removida do watchdog', { instanceId });
    }

    /**
     * Reseta o contador de tentativas de uma instância
     */
    resetRetries(instanceId: string) {
        this.retryAttempts.set(instanceId, 0);
        this.logger.info('Contador de tentativas resetado', { instanceId });
    }

    /**
     * Verifica todas as conexões registradas
     */
    private async checkConnections() {
        const instances = await this.database.query<any>(
            'SELECT id, status, tenant_id FROM web_instances'
        );

        for (const instance of instances) {
            // Verifica se a instância está desconectada e tem callback registrado
            if (instance.status === 'disconnected' && this.reconnectCallbacks.has(instance.id)) {
                await this.attemptReconnect(instance.id, instance.tenant_id);
            }
        }
    }

    /**
     * Tenta reconectar uma instância com backoff exponencial
     */
    private async attemptReconnect(instanceId: string, tenantId: string) {
        const attempts = this.retryAttempts.get(instanceId) || 0;

        if (attempts >= this.config.maxRetries) {
            this.logger.warn('Máximo de tentativas de reconexão atingido', {
                instanceId,
                attempts
            });

            // Notifica o tenant sobre a falha
            await this.database.run(
                `INSERT INTO web_notifications (tenant_id, title, message, type) 
                 VALUES (?, ?, ?, ?)`,
                [
                    tenantId,
                    'Falha na Reconexão',
                    `A instância ${instanceId} não pôde ser reconectada automaticamente após ${attempts} tentativas. Por favor, reconecte manualmente.`,
                    'error'
                ]
            );

            return;
        }

        // Calcula o delay com backoff exponencial
        const delay = Math.min(
            this.config.retryDelay * Math.pow(2, attempts),
            this.config.maxRetryDelay
        );

        this.logger.info('Tentando reconectar instância', {
            instanceId,
            attempt: attempts + 1,
            maxRetries: this.config.maxRetries,
            delayMs: delay
        });

        // Aguarda o delay
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            const reconnectCallback = this.reconnectCallbacks.get(instanceId);
            if (reconnectCallback) {
                await reconnectCallback();

                // Verifica se a reconexão foi bem-sucedida
                const instance = await this.database.get<any>(
                    'SELECT status FROM web_instances WHERE id = ?',
                    [instanceId]
                );

                if (instance?.status === 'connected' || instance?.status === 'qr') {
                    this.logger.info('Instância reconectada com sucesso', { instanceId });
                    this.resetRetries(instanceId);

                    // Notifica o sucesso
                    await this.database.run(
                        `INSERT INTO web_notifications (tenant_id, title, message, type) 
                         VALUES (?, ?, ?, ?)`,
                        [
                            tenantId,
                            'Reconexão Bem-Sucedida',
                            `A instância ${instanceId} foi reconectada automaticamente.`,
                            'success'
                        ]
                    );
                } else {
                    // Incrementa o contador de tentativas
                    this.retryAttempts.set(instanceId, attempts + 1);
                }
            }
        } catch (error) {
            this.logger.error('Erro ao tentar reconectar instância: ' + instanceId, error as Error);
            this.retryAttempts.set(instanceId, attempts + 1);
        }
    }

    /**
     * Força uma tentativa de reconexão imediata
     */
    async forceReconnect(instanceId: string) {
        this.logger.info('Reconexão forçada solicitada', { instanceId });
        this.resetRetries(instanceId);

        const instance = await this.database.get<any>(
            'SELECT tenant_id FROM web_instances WHERE id = ?',
            [instanceId]
        );

        if (instance) {
            await this.attemptReconnect(instanceId, instance.tenant_id);
        }
    }
}
