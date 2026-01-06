import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createQuickMessagesRoutes(
    database: DatabaseService,
    logger: LogService
): Router {
    const router = Router();

    router.use(authMiddleware);

    // GET /api/quick-messages - List all quick messages
    router.get('/', async (req: AuthRequest, res: Response) => {
        try {
            const messages = await database.all('SELECT * FROM web_quick_messages WHERE tenant_id = ? ORDER BY usage_count DESC', [req.tenantId]);

            res.json({
                success: true,
                data: messages.map((m: any) => ({
                    ...m,
                    variables: JSON.parse(m.variables || '[]')
                }))
            });
        } catch (error) {
            logger.error('Erro ao listar mensagens rápidas', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // POST /api/quick-messages - Create new quick message
    router.post('/', async (req: AuthRequest, res: Response) => {
        try {
            const { title, content, shortcut, variables, category } = req.body;

            if (!title || !content || !shortcut) {
                return res.status(400).json({ success: false, error: 'Título, conteúdo e atalho são obrigatórios' });
            }

            const id = `qm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await database.run(`
        INSERT INTO web_quick_messages (id, tenant_id, title, content, shortcut, variables, category, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                id,
                req.tenantId,
                title,
                content,
                shortcut.replace('/', ''),
                JSON.stringify(variables || []),
                category || null,
                req.userId
            ]);

            res.json({ success: true, id });
        } catch (error) {
            logger.error('Erro ao criar mensagem rápida', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // PUT /api/quick-messages/:id - Update quick message
    router.put('/:id', async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { title, content, shortcut, variables, category } = req.body;

            await database.run(`
        UPDATE web_quick_messages 
        SET title = ?, content = ?, shortcut = ?, variables = ?, category = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `, [
                title,
                content,
                shortcut.replace('/', ''),
                JSON.stringify(variables || []),
                category || null,
                id,
                req.tenantId
            ]);

            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao atualizar mensagem rápida', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // DELETE /api/quick-messages/:id - Delete quick message
    router.delete('/:id', async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            await database.run('DELETE FROM web_quick_messages WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao deletar mensagem rápida', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    return router;
}
