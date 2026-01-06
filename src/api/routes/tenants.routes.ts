import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest, adminMiddleware, superAdminOnly } from '../middleware/auth.middleware';
import { v4 as uuidv4 } from 'uuid';

export function createTenantsRoutes(database: DatabaseService, logger: LogService): Router {
    const router = Router();

    // Public route to get branding info by slug or custom domain
    router.get('/public-config/:slug', async (req: Request, res: Response) => {
        try {
            const { slug } = req.params;

            // Search by ID (slug) or custom_domain
            const tenant = await database.get<any>(
                'SELECT id, name, logo_url, primary_color, secondary_color, industry_type FROM tenants WHERE id = ? OR custom_domain = ?',
                [slug, slug]
            );

            if (!tenant) {
                res.status(404).json({ success: false, error: 'Tenant não encontrado' });
                return;
            }

            res.json({ success: true, config: tenant });
        } catch (error) {
            logger.error('Erro ao buscar public-config', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // List all tenants (superadmin only)
    router.get('/', authMiddleware, superAdminOnly, async (_req: AuthRequest, res: Response) => {
        try {
            const tenants = await database.query('SELECT * FROM tenants ORDER BY created_at DESC');
            res.json({ success: true, tenants });
        } catch (error) {
            logger.error('Erro ao listar tenants', error as Error);
            res.status(500).json({ error: 'Erro interno ao listar tenants' });
        }
    });

    // Create tenant (superadmin only)
    router.post('/', authMiddleware, superAdminOnly, async (req: AuthRequest, res: Response) => {
        try {
            const {
                name, plan_id, max_instances, max_agents, expires_at, industry_type,
                custom_domain, asaas_customer_id, pagarme_customer_id, pagarme_subscription_id,
                module_ai_evaluation
            } = req.body;

            if (!name) {
                res.status(400).json({ error: 'Nome é obrigatório' });
                return;
            }

            const id = `tnt_${uuidv4().substring(0, 8)}`;

            await database.run(`
                INSERT INTO tenants (
                    id, name, status, plan_id, max_instances, max_agents, 
                    expires_at, industry_type, custom_domain, asaas_customer_id, 
                    pagarme_customer_id, pagarme_subscription_id, module_ai_evaluation
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, name, 'active', plan_id || 'trial', max_instances || 1, max_agents || 2,
                expires_at, industry_type || 'general', custom_domain, asaas_customer_id,
                pagarme_customer_id, pagarme_subscription_id, module_ai_evaluation || false
            ]);

            res.json({ success: true, tenantId: id });
        } catch (error) {
            logger.error('Erro ao criar tenant', error as Error);
            res.status(500).json({ error: 'Erro interno ao criar tenant' });
        }
    });

    // Update tenant (self or superadmin)
    router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const {
                name, status, plan_id, max_instances, max_agents, expires_at,
                industry_type, custom_domain, asaas_customer_id,
                pagarme_customer_id, pagarme_subscription_id, module_ai_evaluation
            } = req.body;

            // Permission check: only self-tenant or superadmin can update
            if (req.userRole !== 'superadmin' && req.tenantId !== id) {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            // Only superadmin can change critical fields
            if (req.userRole === 'superadmin') {
                await database.run(`
                    UPDATE tenants SET 
                    name = ?, status = ?, plan_id = ?, 
                    max_instances = ?, max_agents = ?, expires_at = ?,
                    industry_type = ?, custom_domain = ?,
                    asaas_customer_id = ?, pagarme_customer_id = ?, pagarme_subscription_id = ?,
                    module_ai_evaluation = ?,
                    updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [
                    name, status, plan_id, max_instances, max_agents, expires_at,
                    industry_type || 'general', custom_domain, asaas_customer_id,
                    pagarme_customer_id, pagarme_subscription_id, module_ai_evaluation || false, id
                ]);
            } else {
                // Regular admin can only change name and industry_type via branding route typically, 
                // but let's allow it here if they are the tenant owner
                await database.run(`
                    UPDATE tenants SET 
                    name = ?, industry_type = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [name, industry_type || 'general', id]);
            }

            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao atualizar tenant', error as Error);
            res.status(500).json({ error: 'Erro interno ao atualizar tenant' });
        }
    });

    // Get current tenant configuration
    router.get(['/me', '/me/config'], authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const tenant = await database.get('SELECT * FROM tenants WHERE id = ?', [req.tenantId]);
            if (!tenant) {
                res.status(404).json({ error: 'Tenant não encontrado' });
                return;
            }
            res.json({ success: true, tenant });
        } catch (error) {
            logger.error('Erro ao buscar tenant', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Update branding
    router.put('/me/branding', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const { name, primary_color, secondary_color, logo_url, industry_type, custom_domain } = req.body;
            const id = req.tenantId;

            await database.run(`
                UPDATE tenants SET 
                name = ?, primary_color = ?, secondary_color = ?, logo_url = ?, industry_type = ?, custom_domain = ?,
                updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [name, primary_color, secondary_color, logo_url, industry_type || 'general', custom_domain, id]);

            res.json({
                success: true,
                message: 'Identidade visual atualizada!',
                industry_type: industry_type || 'general'
            });
        } catch (error) {
            logger.error('Erro ao atualizar branding', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Get usage metrics and limits
    router.get('/me/usage', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const tenant = await database.get<any>('SELECT max_instances, max_agents, expires_at FROM tenants WHERE id = ?', [req.tenantId]);
            const instancesCount = await database.get<any>('SELECT COUNT(*) as count FROM web_instances WHERE tenant_id = ?', [req.tenantId]);
            const agentsCount = await database.get<any>('SELECT COUNT(*) as count FROM web_users WHERE tenant_id = ?', [req.tenantId]);

            res.json({
                success: true,
                usage: {
                    instances: {
                        current: instancesCount.count,
                        limit: tenant.max_instances
                    },
                    agents: {
                        current: agentsCount.count,
                        limit: tenant.max_agents
                    },
                    expiresAt: tenant.expires_at
                }
            });
        } catch (error) {
            logger.error('Erro ao buscar uso do tenant', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Get current plan and available plans
    router.get('/me/plan', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const tenant = await database.get<any>('SELECT plan_id, expires_at, created_at FROM tenants WHERE id = ?', [req.tenantId]);
            const currentPlan = await database.get<any>('SELECT * FROM plans WHERE id = ?', [tenant.plan_id]);
            const availablePlans = await database.query('SELECT * FROM plans ORDER BY price_monthly ASC');

            res.json({
                success: true,
                plan: currentPlan,
                subscription: {
                    expiresAt: tenant.expires_at,
                    createdAt: tenant.created_at
                },
                availablePlans
            });
        } catch (error) {
            logger.error('Erro ao buscar plano do tenant', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Upgrade plan
    router.post('/me/upgrade', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const { planId } = req.body;

            const plan = await database.get<any>('SELECT * FROM plans WHERE id = ?', [planId]);
            if (!plan) {
                res.status(404).json({ error: 'Plano não encontrado' });
                return;
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            await database.run(`
                UPDATE tenants SET 
                plan_id = ?, 
                max_instances = ?, 
                max_agents = ?, 
                ai_enabled = ?,
                can_use_api = ?,
                expires_at = ?,
                status = 'active',
                updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [
                plan.id,
                plan.max_instances,
                plan.max_agents,
                plan.ai_enabled ? 1 : 0,
                plan.can_use_api ? 1 : 0,
                expiresAt.toISOString(),
                req.tenantId
            ]);

            res.json({ success: true, message: `Upgrade para o plano ${plan.name} realizado com sucesso!` });
        } catch (error) {
            logger.error('Erro ao realizar upgrade de plano', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Get notifications
    router.get('/me/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const notifications = await database.query(`
                SELECT * FROM web_notifications 
                WHERE tenant_id = ? 
                ORDER BY created_at DESC 
                LIMIT 20
            `, [req.tenantId]);

            res.json({ success: true, notifications });
        } catch (error) {
            logger.error('Erro ao buscar notificações', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Mark notification as read
    router.post('/me/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            await database.run(`
                UPDATE web_notifications SET is_read = 1 
                WHERE id = ? AND tenant_id = ?
            `, [req.params.id, req.tenantId]);

            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao marcar notificação como lida', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Get API Key
    router.get('/me/api-key', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const tenant = await database.get<any>('SELECT api_key, can_use_api FROM tenants WHERE id = ?', [req.tenantId]);
            res.json({ success: true, apiKey: tenant.api_key, canUseApi: tenant.can_use_api });
        } catch (error) {
            logger.error('Erro ao buscar API key', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Generate/Rotate API Key
    router.post('/me/api-key/generate', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const tenant = await database.get<any>('SELECT can_use_api FROM tenants WHERE id = ?', [req.tenantId]);

            if (!tenant.can_use_api) {
                res.status(403).json({ error: 'Seu plano não inclui acesso a API.' });
                return;
            }

            const newApiKey = `ok_${uuidv4().replace(/-/g, '')}`;
            await database.run('UPDATE tenants SET api_key = ? WHERE id = ?', [newApiKey, req.tenantId]);

            res.json({ success: true, apiKey: newApiKey });
        } catch (error) {
            logger.error('Erro ao gerar API key', error as Error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Export tenant data (Backup)
    router.get('/me/export', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const tenantId = req.tenantId;

            // 1. Tenant Info
            const tenant = await database.get<any>('SELECT * FROM tenants WHERE id = ?', [tenantId]);

            // 2. Employees (Web Users)
            const employees = await database.all<any>('SELECT * FROM web_users WHERE tenant_id = ?', [tenantId]);
            employees.forEach((emp: any) => {
                delete emp.password_hash;
                delete emp.two_factor_secret;
            });

            // 3. Customers (Web Customers)
            const customers = await database.all<any>('SELECT * FROM web_customers WHERE tenant_id = ?', [tenantId]);

            // 4. Bot Users (Leads)
            const botContacts = await database.all<any>('SELECT * FROM users WHERE tenant_id = ?', [tenantId]);

            const exportData = {
                account: tenant,
                employees,
                customers,
                bot_contacts: botContacts,
                export_date: new Date().toISOString()
            };

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=nyvlo-export-${tenantId}.json`);
            res.json(exportData);

        } catch (error) {
            logger.error('Erro ao exportar dados do tenant', error as Error);
            res.status(500).json({ error: 'Erro interno na exportação' });
        }
    });

    // Delete tenant (superadmin only)
    router.delete('/:id', authMiddleware, superAdminOnly, async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;

            if (id === 'system-default') {
                res.status(400).json({ error: 'Não é possível excluir o tenant padrão do sistema' });
                return;
            }

            await database.transaction(async () => {
                // Cleanup order is important due to FKs
                // Start with tables that reference other tables which then reference tenant_id
                await database.run('DELETE FROM bot_form_steps WHERE form_id IN (SELECT id FROM bot_forms WHERE tenant_id = ?)', [id]);
                await database.run('DELETE FROM bot_faq_questions WHERE tenant_id = ?', [id]);
                await database.run('DELETE FROM web_conversation_labels WHERE tenant_id = ?', [id]);
                await database.run('DELETE FROM web_conversation_ratings WHERE tenant_id = ?', [id]);
                await database.run('DELETE FROM web_messages WHERE tenant_id = ?', [id]);
                await database.run('DELETE FROM web_agent_status_history WHERE tenant_id = ?', [id]);
                await database.run('DELETE FROM web_contact_custom_fields WHERE tenant_id = ?', [id]);

                // Tables that directly reference tenant_id
                const tables = [
                    'sessions', 'appointments', 'enrollments', 'conversations', 'notifications',
                    'documents', 'admins', 'bot_settings', 'bot_courses', 'bot_faq_categories',
                    'bot_keywords', 'bot_forms', 'bot_leads', 'bot_events', 'bot_knowledge_base',
                    'bot_orders', 'web_users', 'web_conversations', 'web_instances', 'web_contacts',
                    'web_group_participants', 'web_quick_messages', 'web_labels', 'web_notifications',
                    'users'
                ];

                for (const table of tables) {
                    await database.run(`DELETE FROM ${table} WHERE tenant_id = ?`, [id]);
                }

                // Finally delete the tenant itself
                await database.run('DELETE FROM tenants WHERE id = ?', [id]);
            });

            res.json({ success: true, message: 'Empresa e todos os dados associados foram excluídos com sucesso' });
        } catch (error) {
            logger.error('Erro ao excluir tenant', error as Error);
            res.status(500).json({ error: 'Erro interno ao excluir tenant' });
        }
    });

    return router;
}
