import * as Sentry from '@sentry/node';
import { Application } from 'express';
import { LogService } from './log-service';

export class MonitoringService {
    private logger: LogService;
    private enabled: boolean = false;

    constructor(logger: LogService) {
        this.logger = logger;
        this.initialize();
    }

    private initialize() {
        const sentryDsn = process.env.SENTRY_DSN;

        if (sentryDsn) {
            Sentry.init({
                dsn: sentryDsn,
                environment: process.env.NODE_ENV || 'development',
                tracesSampleRate: 0.1,
            });

            this.enabled = true;
            this.logger.info('Sentry inicializado para monitoramento de erros');
        } else {
            this.logger.warn('SENTRY_DSN não configurado. Monitoramento de erros desabilitado.');
        }
    }

    /**
     * Integra o Sentry com o Express
     */
    integrateWithExpress(app: Application) {
        if (!this.enabled) return;
        // Sentry v8 não precisa de handlers manuais
        this.logger.info('Sentry integrado com Express');
    }

    /**
     * Adiciona o error handler do Sentry (deve ser o último middleware)
     */
    addErrorHandler(app: Application) {
        if (!this.enabled) return;

        // Error handler genérico que envia para o Sentry
        app.use((err: any, req: any, res: any, next: any) => {
            this.captureException(err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        });
    }

    /**
     * Captura uma exceção manualmente
     */
    captureException(error: Error, context?: Record<string, any>) {
        if (!this.enabled) {
            this.logger.error('Erro capturado (Sentry desabilitado)', error);
            return;
        }

        Sentry.captureException(error, {
            extra: context,
        });

        this.logger.error('Erro enviado ao Sentry', error);
    }

    /**
     * Captura uma mensagem de log
     */
    captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
        if (!this.enabled) {
            this.logger.info(message);
            return;
        }

        Sentry.captureMessage(message, {
            level: level as any,
            extra: context,
        });
    }

    /**
     * Define o contexto do usuário para rastreamento
     */
    setUserContext(userId: string, tenantId: string, email?: string) {
        if (!this.enabled) return;

        Sentry.setUser({
            id: userId,
            email: email,
            tenant_id: tenantId,
        });
    }

    /**
     * Limpa o contexto do usuário
     */
    clearUserContext() {
        if (!this.enabled) return;
        Sentry.setUser(null);
    }

    /**
     * Adiciona breadcrumb (rastro de navegação)
     */
    addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
        if (!this.enabled) return;

        Sentry.addBreadcrumb({
            message,
            category,
            data,
            level: 'info',
        });
    }

    /**
     * Fecha a conexão com o Sentry (útil para graceful shutdown)
     */
    async close(timeout: number = 2000): Promise<void> {
        if (!this.enabled) return;

        await Sentry.close(timeout);
        this.logger.info('Sentry encerrado');
    }
}
