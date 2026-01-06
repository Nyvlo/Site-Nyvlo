import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { PaymentService } from '../../services/payment-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createPaymentRoutes(database: DatabaseService, logger: LogService): Router {
    const router = Router();
    const paymentService = new PaymentService(database, logger);

    // POST /api/payments/create-pix
    // Authenticated route to generate a PIX for a plan upgrade/renewal
    router.post('/create-pix', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const { planId } = req.body;
            const tenantId = req.tenantId;

            if (!planId || !tenantId) {
                res.status(400).json({ error: 'PlanId é obrigatório' });
                return;
            }

            const paymentInfo = await paymentService.createSubscriptionPayment(tenantId, planId);

            res.json({
                success: true,
                payment: paymentInfo
            });
        } catch (error) {
            logger.error('Erro ao gerar PIX', error as Error);
            res.status(500).json({ error: 'Erro interno ao processar pagamento' });
        }
    });

    // GET /api/payments/history
    // Returns payment history for the current tenant
    router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const tenantId = req.tenantId;

            const orders = await database.query(`
                SELECT o.*, u.name as customer_name, u.phone as customer_phone
                FROM bot_orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.tenant_id = ?
                ORDER BY o.created_at DESC
                LIMIT 100
            `, [tenantId]);

            res.json({
                success: true,
                orders
            });
        } catch (error) {
            logger.error('Erro ao buscar histórico de pagamentos', error as Error);
            res.status(500).json({ error: 'Erro interno ao processar histórico' });
        }
    });

    // POST /api/webhooks/asaas
    // Public route for Asaas webhook
    router.post('/webhook/asaas', async (req, res) => {
        try {
            const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
            if (webhookToken && req.headers['asaas-access-token'] !== webhookToken) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            await paymentService.handleWebhook(req.body, 'asaas');
            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao processar webhook Asaas', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // POST /api/webhooks/pagarme
    // Public route for Pagar.me webhook
    router.post('/webhook/pagarme', async (req, res) => {
        try {
            await paymentService.handleWebhook(req.body, 'pagarme');
            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao processar webhook Pagar.me', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    return router;
}
