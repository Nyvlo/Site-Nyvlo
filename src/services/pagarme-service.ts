import { DatabaseService } from './database-service';
import { LogService } from './log-service';
import axios from 'axios';

export class PagarmeService {
    private apiKey: string;
    private apiUrl: string = 'https://api.pagar.me/core/v5';

    constructor(
        private database: DatabaseService,
        private logger: LogService
    ) {
        this.apiKey = process.env.PAGARME_API_KEY || 'sk_test_...';
    }

    private get authHeader() {
        return {
            Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Cria ou busca um cliente no Pagar.me
     */
    async getOrCreateCustomer(tenantId: string): Promise<string> {
        const tenant = await this.database.get<any>('SELECT * FROM tenants WHERE id = ?', [tenantId]);
        if (!tenant) throw new Error('Tenant não encontrado');

        if (tenant.pagarme_customer_id) return tenant.pagarme_customer_id;

        const admin = await this.database.get<any>("SELECT email, name FROM web_users WHERE tenant_id = ? AND role = 'admin' LIMIT 1", [tenantId]);

        try {
            const response = await axios.post(`${this.apiUrl}/customers`, {
                name: admin?.name || tenant.name,
                email: admin?.email || 'contato@nyvlo.com',
                type: 'individual',
                document: '00000000000', // CPF/CNPJ fictício se não houver
            }, { headers: this.authHeader });

            const customerId = response.data.id;
            await this.database.run('UPDATE tenants SET pagarme_customer_id = ? WHERE id = ?', [customerId, tenantId]);
            return customerId;
        } catch (error: any) {
            this.logger.error('Erro ao criar cliente no Pagar.me', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Cria um pedido via PIX (Assinatura ou Venda)
     */
    async createPixOrder(tenantId: string, amount: number, description: string, metadata: any): Promise<any> {
        const customerId = await this.getOrCreateCustomer(tenantId);

        try {
            const response = await axios.post(`${this.apiUrl}/orders`, {
                customer_id: customerId,
                items: [
                    {
                        amount: Math.round(amount * 100), // Pagar.me usa centavos
                        description,
                        quantity: 1
                    }
                ],
                payments: [
                    {
                        payment_method: 'pix',
                        pix: {
                            expires_in: 3600 // 1 hora
                        }
                    }
                ],
                metadata
            }, { headers: this.authHeader });

            const charge = response.data.charges[0];
            return {
                orderId: response.data.id,
                chargeId: charge.id,
                pixCopyPaste: charge.last_transaction.qr_code,
                pixQrCode: charge.last_transaction.qr_code_url,
                status: charge.status
            };
        } catch (error: any) {
            this.logger.error('Erro ao criar pedido PIX no Pagar.me', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Processa Webhooks do Pagar.me
     */
    async handleWebhook(payload: any): Promise<void> {
        const event = payload.type;
        const data = payload.data;

        this.logger.info(`Recebido Webhook Pagar.me: ${event}`, { orderId: data.id });

        if (event === 'order.paid') {
            const metadata = data.metadata;
            const type = metadata.type; // 'subscription' ou 'item'

            if (type === 'subscription') {
                const { tenantId, planId } = metadata;
                await this.activateSubscription(tenantId, planId, data.id);
                await this.notifyAdmins('Assinatura SaaS Recebida', `Uma nova assinatura do plano ${planId} foi paga pelo Tenant ${tenantId}.`);
            } else if (type === 'item') {
                const { tenantId, userId, itemId } = metadata;
                await this.confirmItemSale(tenantId, userId, itemId, data.id, data.amount / 100);
                await this.notifyAdmins('Venda Bot Confirmada', `O item ${itemId} foi vendido por R$ ${data.amount / 100} no Tenant ${tenantId}.`);
            }
        }
    }

    private async notifyAdmins(title: string, message: string) {
        try {
            // Busca todos os superadmins para notificar no dashboard principal
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

    private async activateSubscription(tenantId: string, planId: string, orderId: string) {
        this.logger.info(`Ativando assinatura via Pagar.me: Tenant=${tenantId}, Plano=${planId}`);

        const plan = await this.database.get<any>('SELECT * FROM plans WHERE id = ?', [planId]);
        if (!plan) return;

        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);

        await this.database.run(`
            UPDATE tenants SET 
            plan_id = ?, 
            status = 'active',
            max_instances = ?, 
            max_agents = ?, 
            ai_enabled = ?,
            can_use_api = ?,
            expires_at = ?,
            updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [
            plan.id,
            plan.max_instances,
            plan.max_agents,
            plan.ai_enabled ? 1 : 0,
            plan.can_use_api ? 1 : 0,
            newExpiry.toISOString(),
            tenantId
        ]);

        await this.database.run(
            "INSERT INTO web_notifications (tenant_id, title, message, type) VALUES (?, ?, ?, ?)",
            [tenantId, 'Assinatura Ativada (Pagar.me)', `Obrigado! Seu plano ${plan.name} foi ativado com sucesso.`, 'success']
        );
    }

    private async confirmItemSale(tenantId: string, userId: string, itemId: string, orderId: string, amount: number) {
        this.logger.info(`Confirmando venda de item via Pagar.me: Item=${itemId}`);

        await this.database.run(`
            INSERT INTO bot_orders (id, tenant_id, user_id, item_id, amount, status, external_id)
            VALUES ($1, $2, $3, $4, $5, 'paid', $6)
            ON CONFLICT (external_id) DO UPDATE SET status = 'paid'
        `, [`pay_${Date.now()}`, tenantId, userId, itemId, amount, orderId]);

        await this.database.run(
            "INSERT INTO web_notifications (tenant_id, title, message, type) VALUES (?, ?, ?, ?)",
            [tenantId, 'Venda Pagar.me Confirmada', `Item ${itemId} vendido. Valor total: R$ ${amount.toFixed(2)}`, 'success']
        );
    }
}
