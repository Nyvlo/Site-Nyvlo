import { DatabaseService } from './database-service';
import { LogService } from './log-service';
import { EmailService } from './email-service';

export class SubscriptionService {
    private database: DatabaseService;
    private logger: LogService;
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly GRACE_PERIOD_DAYS = 3;

    constructor(
        database: DatabaseService,
        logger: LogService,
        private emailService?: EmailService
    ) {
        this.database = database;
        this.logger = logger;
    }

    /**
     * Inicia o verificador automático de assinaturas (roda a cada 12 horas)
     */
    start(): void {
        this.logger.info('Iniciando verificador de assinaturas...');

        // Verificação imediata ao iniciar
        this.checkExpirations();

        // Agenda verificações periódicas (12 horas)
        this.checkInterval = setInterval(() => {
            this.checkExpirations();
        }, 12 * 60 * 60 * 1000);
    }

    stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }

    /**
     * Verifica e atualiza status de tenants expirados
     */
    async checkExpirations(): Promise<void> {
        try {
            this.logger.info('Rodando verificação de rotina de assinaturas...');

            // 1. Marcar como 'expired' aqueles que passaram da data de expiração mas estão dentro do período de graça
            // Nota: 'active' com data vencida = 'grace_period' ou apenas aviso no middleware

            // 2. Suspender definitivamente quem passou do período de graça
            const suspensionDate = new Date();
            suspensionDate.setDate(suspensionDate.getDate() - this.GRACE_PERIOD_DAYS);

            const expiredTenants = await this.database.query<any>(`
                SELECT id, name FROM tenants 
                WHERE status = 'active' 
                AND expires_at IS NOT NULL 
                AND expires_at < ?
            `, [suspensionDate.toISOString()]);

            for (const tenant of expiredTenants) {
                this.logger.warn(`Suspendendo tenant por falta de pagamento após período de graça: ${tenant.name} (${tenant.id})`);

                await this.database.run(`
                    UPDATE tenants SET 
                    status = 'suspended', 
                    updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [tenant.id]);

                // Create notification for suspension
                await this.createNotification(
                    tenant.id,
                    'Conta Suspensa',
                    'Sua conta foi suspensa por falta de pagamento após o período de carência.',
                    'error'
                );
            }

            // 3. Alertar tenants que estão prestes a expirar (menos de 3 dias)
            const warningDate = new Date();
            warningDate.setDate(warningDate.getDate() + 3);

            const nearingExpiry = await this.database.query<any>(`
                SELECT id, name, expires_at FROM tenants 
                WHERE status = 'active' 
                AND expires_at IS NOT NULL 
                AND expires_at < ? 
                AND expires_at > CURRENT_TIMESTAMP
            `, [warningDate.toISOString()]);

            for (const tenant of nearingExpiry) {
                const expiryStr = new Date(tenant.expires_at).toLocaleDateString();
                await this.createNotification(
                    tenant.id,
                    'Sua assinatura expira em breve',
                    `Sua assinatura vencerá em ${expiryStr}. Realize o upgrade ou renovação para evitar interrupções.`,
                    'warning'
                );

                // Enviar e-mail de aviso
                const admin = await this.database.get<any>("SELECT email FROM web_users WHERE tenant_id = ? AND role = 'admin' LIMIT 1", [tenant.id]);
                if (admin?.email && this.emailService) {
                    await this.emailService.sendExpiryWarning(admin.email, 3); // 3 dias aproximados
                }
            }

            if (expiredTenants.length > 0) {
                this.logger.info(`${expiredTenants.length} tenants foram suspensos automaticamente.`);
            }

        } catch (error) {
            this.logger.error('Erro na rotina de verificação de assinaturas', error as Error);
        }
    }

    private async createNotification(tenantId: string, title: string, message: string, type: string = 'info'): Promise<void> {
        // Verifica se já existe uma notificação igual hoje para evitar spam
        const today = new Date().toISOString().split('T')[0];
        const existing = await this.database.get(
            "SELECT id FROM web_notifications WHERE tenant_id = ? AND title = ? AND created_at >= ?",
            [tenantId, title, today]
        );

        if (!existing) {
            await this.database.run(
                "INSERT INTO web_notifications (tenant_id, title, message, type) VALUES (?, ?, ?, ?)",
                [tenantId, title, message, type]
            );
        }
    }

    /**
     * Retorna a data de corte para suspensão definitiva (periodo de graça)
     */
    getGracePeriodLimit(): Date {
        const date = new Date();
        date.setDate(date.getDate() - this.GRACE_PERIOD_DAYS);
        return date;
    }
}
