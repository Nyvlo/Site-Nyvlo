import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest, superAdminOnly } from '../middleware/auth.middleware';

export function createFinanceRouter(database: DatabaseService, logger: LogService): Router {
    const router = Router();

    // Dashboard Overview (MRR, Active Clients, Projection)
    router.get('/overview', authMiddleware, superAdminOnly, async (req: AuthRequest, res: Response) => {
        try {
            // Calculate MRR (Sum of monthly price for all active tenants)
            const mrrResult = await database.get<{ total_mrr: number }>(`
                SELECT SUM(p.price_monthly) as total_mrr 
                FROM tenants t 
                JOIN plans p ON t.plan_id = p.id 
                WHERE t.status = 'active'
            `);

            // Count Active Clients
            const activeClientsResult = await database.get<{ count: number }>(`
                SELECT COUNT(*) as count FROM tenants WHERE status = 'active'
            `);

            // Count Trial Clients (Potential Revenue)
            const trialClientsResult = await database.get<{ count: number }>(`
                SELECT COUNT(*) as count FROM tenants WHERE status = 'trial'
            `);

            // Calculate Projected Revenue (Active + Trial converting at 100% just for projection)
            const projectedResult = await database.get<{ projected_revenue: number }>(`
                SELECT SUM(p.price_monthly) as projected_revenue 
                FROM tenants t 
                JOIN plans p ON t.plan_id = p.id 
                WHERE t.status IN ('active', 'trial')
            `);

            const totalMrr = mrrResult?.total_mrr || 0;
            const activeClients = activeClientsResult?.count || 0;
            const totalClients = (activeClientsResult?.count || 0) + (trialClientsResult?.count || 0);

            // Average Ticket
            const averageTicket = activeClients > 0 ? totalMrr / activeClients : 0;

            res.json({
                success: true,
                data: {
                    mrr: totalMrr,
                    activeClients,
                    trialClients: trialClientsResult?.count || 0,
                    projectedRevenue: projectedResult?.projected_revenue || 0,
                    averageTicket,
                    growthRate: 12.5 // Hardcoded for now, would need historical data
                }
            });
        } catch (error) {
            logger.error('Erro ao buscar dados financeiros', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // List of Clients with Financial Details
    router.get('/clients', authMiddleware, superAdminOnly, async (req: AuthRequest, res: Response) => {
        try {
            const clients = await database.all(`
                SELECT 
                    t.id, 
                    t.name, 
                    t.status, 
                    t.created_at,
                    t.expires_at,
                    p.name as plan_name, 
                    p.price_monthly,
                    p.id as plan_id
                FROM tenants t 
                LEFT JOIN plans p ON t.plan_id = p.id
                ORDER BY t.created_at DESC
            `);

            res.json({ success: true, clients });
        } catch (error) {
            logger.error('Erro ao buscar lista de clientes financeiros', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    return router;
}
