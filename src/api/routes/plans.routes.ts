import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest, superAdminOnly } from '../middleware/auth.middleware';

export function createPlansRouter(database: DatabaseService, logger: LogService): Router {
    const router = Router();

    // List all plans
    router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const plans = await database.all('SELECT * FROM plans ORDER BY price_monthly ASC');
            res.json({ success: true, plans });
        } catch (error) {
            logger.error('Erro ao listar planos', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Get single plan
    router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const plan = await database.get('SELECT * FROM plans WHERE id = ?', [id]);

            if (!plan) {
                res.status(404).json({ error: 'Plano não encontrado' });
                return;
            }

            res.json({ success: true, plan });
        } catch (error) {
            logger.error('Erro ao buscar plano', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Create plan (superadmin only)
    router.post('/', authMiddleware, superAdminOnly, async (req: AuthRequest, res: Response) => {
        try {
            const {
                id,
                name,
                description,
                price_monthly,
                max_instances,
                max_agents,
                ai_enabled,
                can_use_api,
                addon_ai_evaluation_price
            } = req.body;

            // Validation
            if (!id || !name) {
                res.status(400).json({ error: 'ID e nome são obrigatórios' });
                return;
            }

            // Check if plan ID already exists
            const existing = await database.get('SELECT id FROM plans WHERE id = ?', [id]);
            if (existing) {
                res.status(400).json({ error: 'Já existe um plano com este ID' });
                return;
            }

            await database.run(`
                INSERT INTO plans (
                    id, name, description, price_monthly, 
                    max_instances, max_agents, ai_enabled, can_use_api,
                    addon_ai_evaluation_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                name,
                description || null,
                price_monthly || 0,
                max_instances || 1,
                max_agents || 2,
                ai_enabled || false,
                can_use_api || false,
                addon_ai_evaluation_price || 0
            ]);

            res.json({ success: true, message: 'Plano criado com sucesso' });
        } catch (error) {
            logger.error('Erro ao criar plano', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Update plan (superadmin only)
    router.put('/:id', authMiddleware, superAdminOnly, async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                price_monthly,
                max_instances,
                max_agents,
                ai_enabled,
                can_use_api,
                addon_ai_evaluation_price
            } = req.body;

            // Check if plan exists
            const existing = await database.get('SELECT id FROM plans WHERE id = ?', [id]);
            if (!existing) {
                res.status(404).json({ error: 'Plano não encontrado' });
                return;
            }

            await database.run(`
                UPDATE plans SET
                    name = ?,
                    description = ?,
                    price_monthly = ?,
                    max_instances = ?,
                    max_agents = ?,
                    ai_enabled = ?,
                    can_use_api = ?,
                    addon_ai_evaluation_price = ?
                WHERE id = ?
            `, [
                name,
                description,
                price_monthly,
                max_instances,
                max_agents,
                ai_enabled,
                can_use_api,
                addon_ai_evaluation_price || 0,
                id
            ]);

            res.json({ success: true, message: 'Plano atualizado com sucesso' });
        } catch (error) {
            logger.error('Erro ao atualizar plano', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Delete plan (superadmin only)
    router.delete('/:id', authMiddleware, superAdminOnly, async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;

            // Check if any tenant is using this plan
            const tenantsUsingPlan = await database.get(
                'SELECT COUNT(*) as count FROM tenants WHERE plan_id = ?',
                [id]
            );

            if ((tenantsUsingPlan as any).count > 0) {
                res.status(400).json({
                    error: `Não é possível excluir. ${(tenantsUsingPlan as any).count} empresa(s) estão usando este plano.`
                });
                return;
            }

            await database.run('DELETE FROM plans WHERE id = ?', [id]);
            res.json({ success: true, message: 'Plano excluído com sucesso' });
        } catch (error) {
            logger.error('Erro ao excluir plano', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    return router;
}
