import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createLabelsRoutes(
    database: DatabaseService,
    logger: LogService
): Router {
    const router = Router();

    router.use(authMiddleware);

    // GET /api/labels - List all labels
    router.get('/', async (req: AuthRequest, res: Response) => {
        try {
            const labels = await database.all('SELECT * FROM web_labels WHERE tenant_id = ? ORDER BY name ASC', [req.tenantId]);
            res.json({ success: true, data: labels });
        } catch (error) {
            logger.error('Erro ao listar etiquetas', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // POST /api/labels - Create label
    router.post('/', async (req: AuthRequest, res: Response) => {
        try {
            const { name, color } = req.body;
            if (!name || !color) {
                return res.status(400).json({ success: false, error: 'Nome e cor são obrigatórios' });
            }

            const id = `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await database.run('INSERT INTO web_labels (id, tenant_id, name, color) VALUES (?, ?, ?, ?)', [id, req.tenantId, name, color]);
            res.json({ success: true, id });
        } catch (error) {
            logger.error('Erro ao criar etiqueta', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // DELETE /api/labels/:id - Delete label
    router.delete('/:id', async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            await database.transaction(async () => {
                await database.run('DELETE FROM web_conversation_labels WHERE label_id = ? AND tenant_id = ?', [id, req.tenantId]);
                await database.run('DELETE FROM web_labels WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
            });
            res.json({ success: true });
        } catch (error) {
            logger.error('Erro ao deletar etiqueta', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    return router;
}
