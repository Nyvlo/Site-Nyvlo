import { DatabaseService } from './database-service';
import { LogService } from './log-service';
import axios from 'axios';
import { EmailService } from './email-service';
import { PagarmeService } from './pagarme-service';

export class PaymentService {
    private asaasApiKey: string;
    private asaasApiUrl: string;
    private pagarme: PagarmeService;

    constructor(
        private database: DatabaseService,
        private logger: LogService,
        private emailService?: EmailService
    ) {
        this.asaasApiKey = process.env.ASAAS_API_KEY || '$a8p_test_...';
        this.asaasApiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
        this.pagarme = new PagarmeService(database, logger);
    }

    /**
     * Cria uma cobrança via PIX (Suporta Asaas ou Pagar.me)
     */
    async createSubscriptionPayment(tenantId: string, planId: string): Promise<any> {
        const provider = process.env.DEFAULT_PAYMENT_PROVIDER || 'asaas';

        if (provider === 'pagarme') {
            const plan = await this.database.get<any>('SELECT * FROM plans WHERE id = ?', [planId]);
            if (!plan) throw new Error('Plano não encontrado');

            const order = await this.pagarme.createPixOrder(tenantId, plan.price, `Assinatura Nyvlo Omnichannel - ${plan.name}`, {
                type: 'subscription',
                tenantId,
                planId
            });

            return {
                paymentId: order.orderId,
                pixQrCode: order.pixQrCode,
                pixCopyPaste: order.pixCopyPaste,
                value: plan.price,
                provider: 'pagarme'
            };
        }

        // Default Asaas Logic
        try {
            const tenant = await this.database.get<any>('SELECT * FROM tenants WHERE id = ?', [tenantId]);
            const plan = await this.database.get<any>('SELECT * FROM plans WHERE id = ?', [planId]);

            if (!tenant || !plan) throw new Error('Tenant ou Plano não encontrado');

            let customerId = tenant.asaas_customer_id;
            if (!customerId) {
                customerId = await this.createAsaasCustomer(tenant);
                await this.database.run('UPDATE tenants SET asaas_customer_id = ? WHERE id = ?', [customerId, tenantId]);
            }

            const response = await axios.post(`${this.asaasApiUrl}/payments`, {
                customer: customerId,
                billingType: 'PIX',
                value: plan.price,
                dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0],
                description: `Assinatura Nyvlo Omnichannel - Plano ${plan.name}`,
                externalReference: `${tenantId}:${planId}`
            }, {
                headers: { access_token: this.asaasApiKey }
            });

            const paymentData = response.data;
            const qrCodeResponse = await axios.get(`${this.asaasApiUrl}/payments/${paymentData.id}/pixQrCode`, {
                headers: { access_token: this.asaasApiKey }
            });

            return {
                paymentId: paymentData.id,
                invoiceUrl: paymentData.invoiceUrl,
                pixQrCode: qrCodeResponse.data.encodedImage,
                pixCopyPaste: qrCodeResponse.data.payload,
                value: plan.price,
                provider: 'asaas'
            };
        } catch (error: any) {
            this.logger.error('Erro ao criar pagamento no Asaas', error);
            throw error;
        }
    }

    async generatePIX(tenantId: string, userId: string, itemId: string, amount: number, config: any): Promise<any> {
        const provider = config?.provider || 'asaas';

        if (provider === 'pagarme') {
            try {
                const order = await this.pagarme.createPixOrder(tenantId, amount, `Compra de Item Ref: ${itemId}`, {
                    type: 'item',
                    tenantId,
                    userId,
                    itemId
                });
                return {
                    success: true,
                    orderId: order.orderId,
                    copyPaste: order.pixCopyPaste,
                    qrCode: order.pixQrCode,
                    provider: 'pagarme'
                };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        }

        // Asaas Logic
        try {
            const tenant = await this.database.get<any>('SELECT * FROM tenants WHERE id = ?', [tenantId]);
            if (!tenant) throw new Error('Tenant não encontrado');

            let customerId = tenant.asaas_customer_id;
            if (!customerId) {
                customerId = await this.createAsaasCustomer(tenant);
                await this.database.run('UPDATE tenants SET asaas_customer_id = ? WHERE id = ?', [customerId, tenantId]);
            }

            const asaasKey = config?.apiKey || this.asaasApiKey;
            const asaasUrl = config?.apiKey ? (config.isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://www.asaas.com/api/v3') : this.asaasApiUrl;

            const response = await axios.post(`${asaasUrl}/payments`, {
                customer: customerId,
                billingType: 'PIX',
                value: amount,
                dueDate: new Date().toISOString().split('T')[0],
                description: `Pagamento via Bot - Ref: ${itemId}`,
                externalReference: `PAY:${tenantId}:${userId}:${itemId}`
            }, {
                headers: { access_token: asaasKey }
            });

            const paymentData = response.data;
            const qrCodeResponse = await axios.get(`${asaasUrl}/payments/${paymentData.id}/pixQrCode`, {
                headers: { access_token: asaasKey }
            });

            return {
                success: true,
                orderId: paymentData.id,
                copyPaste: qrCodeResponse.data.payload,
                qrCode: qrCodeResponse.data.encodedImage,
                provider: 'asaas'
            };
        } catch (error: any) {
            this.logger.error('Erro ao gerar PIX avulso', error);
            return { success: false, error: error.message };
        }
    }

    private async createAsaasCustomer(tenant: any): Promise<string> {
        const admin = await this.database.get<any>('SELECT email, name FROM web_users WHERE tenant_id = ? AND role = \'admin\' LIMIT 1', [tenant.id]);
        const response = await axios.post(`${this.asaasApiUrl}/customers`, {
            name: admin?.name || tenant.name,
            email: admin?.email || 'email@exemplo.com',
            externalReference: tenant.id
        }, {
            headers: { access_token: this.asaasApiKey }
        });
        return response.data.id;
    }

    async handleWebhook(payload: any, provider: 'asaas' | 'pagarme' = 'asaas'): Promise<void> {
        if (provider === 'pagarme') {
            return this.pagarme.handleWebhook(payload);
        }

        // Existing Asaas Webhook Logic
        const event = payload.event;
        const payment = payload.payment;
        this.logger.info(`Recebido Webhook Asaas: ${event}`, { paymentId: payment.id, ref: payment.externalReference });

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const externalRef = payment.externalReference || '';
            if (externalRef.startsWith('PAY:')) {
                const [, tenantId, userId, itemId] = externalRef.split(':');
                await this.confirmItemSale(tenantId, userId, itemId, payment.id, payment.value);
                await this.notifyAdmins('Venda Bot Confirmada (Asaas)', `O item ${itemId} foi vendido por R$ ${payment.value} no Tenant ${tenantId}.`);
            } else {
                const [tenantId, planId] = externalRef.split(':');
                await this.activateSubscription(tenantId, planId, payment.id, payment.value);
                await this.notifyAdmins('Assinatura SaaS Recebida (Asaas)', `Uma nova assinatura do plano ${planId} foi paga pelo Tenant ${tenantId}.`);
            }
        }
    }

    private async notifyAdmins(title: string, message: string) {
        try {
            const superadmins = await this.database.query<any>("SELECT tenant_id FROM web_users WHERE role = 'superadmin'");
            for (const admin of superadmins) {
                await this.database.run(
                    "INSERT INTO web_notifications (tenant_id, title, message, type) VALUES (?, ?, ?, ?)",
                    [admin.tenant_id, title, message, 'success']
                );
            }
        } catch (error) {
            this.logger.error('Erro ao notificar administradores', error as Error);
        }
    }

    private async activateSubscription(tenantId: string, planId: string, externalId: string, amount: number) {
        const plan = await this.database.get<any>('SELECT * FROM plans WHERE id = ?', [planId]);
        if (!plan) return;
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);
        await this.database.run(`UPDATE tenants SET plan_id = ?, status = 'active', max_instances = ?, max_agents = ?, ai_enabled = ?, can_use_api = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [plan.id, plan.max_instances, plan.max_agents, plan.ai_enabled ? 1 : 0, plan.can_use_api ? 1 : 0, newExpiry.toISOString(), tenantId]);
        await this.database.run("INSERT INTO web_notifications (tenant_id, title, message, type) VALUES (?, ?, ?, ?)", [tenantId, 'Assinatura Ativada', `Seu pagamento de R$ ${amount} foi confirmado! Plano ${plan.name} ativado.`, 'success']);
    }

    private async confirmItemSale(tenantId: string, userId: string, itemId: string, externalId: string, amount: number) {
        await this.database.run(`INSERT INTO bot_orders (id, tenant_id, user_id, item_id, amount, status, external_id) VALUES ($1, $2, $3, $4, $5, 'paid', $6) ON CONFLICT (external_id) DO UPDATE SET status = 'paid'`,
            [`pay_${Date.now()}`, tenantId, userId, itemId, amount, externalId]);
        await this.database.run("INSERT INTO web_notifications (tenant_id, title, message, type) VALUES (?, ?, ?, ?)", [tenantId, 'Novo Pagamento Confirmado', `Venda de R$ ${amount} confirmada para o item ${itemId}.`, 'success']);
    }
}
