import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createRatingsRoutes(
    database: DatabaseService,
    logger: LogService,
    getSocketIO: () => any
): Router {
    const router = Router();

    // Apply auth middleware to all routes
    router.use(authMiddleware);

    // POST /api/ratings - Submit a rating (public endpoint, no auth required for customers)
    router.post('/submit', async (req: AuthRequest, res: Response) => {
        try {
            const { conversationId, instanceId, rating, comment, customerName, customerPhone } = req.body;

            if (!conversationId || !instanceId || !rating) {
                res.status(400).json({ success: false, error: 'Campos obrigatórios: conversationId, instanceId, rating' });
                return;
            }

            if (rating < 1 || rating > 5) {
                res.status(400).json({ success: false, error: 'Rating deve estar entre 1 e 5' });
                return;
            }

            // Get conversation details
            const conversation = await database.get<any>(`
        SELECT assigned_agent_id, status, tenant_id FROM web_conversations 
        WHERE id = ? AND instance_id = ?
      `, [conversationId, instanceId]);

            if (!conversation) {
                res.status(404).json({ success: false, error: 'Conversa não encontrada' });
                return;
            }

            const tenantId = conversation.tenant_id;

            // Check if already rated
            const existingRating = await database.get(`
        SELECT id FROM web_conversation_ratings WHERE conversation_id = ?
      `, [conversationId]);

            if (existingRating) {
                res.status(400).json({ success: false, error: 'Esta conversa já foi avaliada' });
                return;
            }

            // Create rating
            const ratingId = `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await database.run(`
        INSERT INTO web_conversation_ratings (
          id, tenant_id, conversation_id, instance_id, agent_id, rating, comment, 
          customer_name, customer_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                ratingId,
                tenantId,
                conversationId,
                instanceId,
                conversation.assigned_agent_id || null,
                rating,
                comment || null,
                customerName || null,
                customerPhone || null
            ]);

            // Emit socket event
            const io = getSocketIO();
            if (io) {
                io.to(`instance:${instanceId}`).emit('rating:new', {
                    id: ratingId,
                    conversationId,
                    agentId: conversation.assigned_agent_id,
                    rating,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                ratingId,
                message: 'Obrigado pela sua avaliação!'
            });
        } catch (error) {
            logger.error('Erro ao submeter avaliação', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // GET /api/ratings/conversation/:conversationId - Get rating for a conversation
    router.get('/conversation/:conversationId', async (req: AuthRequest, res: Response) => {
        try {
            const { conversationId } = req.params;

            const rating = await database.get(`
        SELECT r.*, u.name as agent_name
        FROM web_conversation_ratings r
        LEFT JOIN web_users u ON r.agent_id = u.id
        WHERE r.conversation_id = ? AND r.tenant_id = ?
      `, [conversationId, req.tenantId]);

            if (!rating) {
                res.status(404).json({ success: false, error: 'Avaliação não encontrada' });
                return;
            }

            res.json({ success: true, rating });
        } catch (error) {
            logger.error('Erro ao buscar avaliação', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // GET /api/ratings/agent/:agentId - Get ratings for an agent
    router.get('/agent/:agentId', async (req: AuthRequest, res: Response) => {
        try {
            const { agentId } = req.params;
            const { limit = '50', offset = '0' } = req.query;

            const ratings = await database.all(`
        SELECT r.*, c.name as conversation_name
        FROM web_conversation_ratings r
        LEFT JOIN web_conversations c ON r.conversation_id = c.id
        WHERE r.agent_id = ? AND r.tenant_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [agentId, req.tenantId, parseInt(limit as string), parseInt(offset as string)]);

            // Calculate statistics
            const stats = await database.get<any>(`
        SELECT 
          COUNT(*) as total,
          AVG(rating) as average,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
        FROM web_conversation_ratings
        WHERE agent_id = ? AND tenant_id = ?
      `, [agentId, req.tenantId]);

            res.json({
                success: true,
                ratings,
                stats: {
                    total: stats?.total || 0,
                    average: stats?.average ? parseFloat(Number(stats.average).toFixed(2)) : 0,
                    distribution: {
                        5: stats?.five_stars || 0,
                        4: stats?.four_stars || 0,
                        3: stats?.three_stars || 0,
                        2: stats?.two_stars || 0,
                        1: stats?.one_star || 0
                    }
                }
            });
        } catch (error) {
            logger.error('Erro ao buscar avaliações do agente', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // GET /api/ratings/instance/:instanceId/stats - Get overall statistics
    router.get('/instance/:instanceId/stats', async (req: AuthRequest, res: Response) => {
        try {
            const { instanceId } = req.params;
            const { period = '30' } = req.query; // days

            const periodDate = new Date();
            periodDate.setDate(periodDate.getDate() - parseInt(period as string));

            const stats = await database.get<any>(`
        SELECT 
          COUNT(*) as total,
          AVG(rating) as average,
          SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as promoters,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as passives,
          SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as detractors
        FROM web_conversation_ratings
        WHERE instance_id = ? AND tenant_id = ? AND created_at >= ?
      `, [instanceId, req.tenantId, periodDate.toISOString()]);

            // Calculate NPS (Net Promoter Score)
            const total = stats?.total || 0;
            const promoters = stats?.promoters || 0;
            const detractors = stats?.detractors || 0;
            const nps = total > 0
                ? Math.round(((promoters - detractors) / total) * 100)
                : 0;

            // Get top agents
            const topAgents = await database.all(`
        SELECT 
          r.agent_id,
          u.name as agent_name,
          COUNT(*) as total_ratings,
          AVG(r.rating) as average_rating
        FROM web_conversation_ratings r
        LEFT JOIN web_users u ON r.agent_id = u.id
        WHERE r.instance_id = ? AND r.tenant_id = ? AND r.created_at >= ? AND r.agent_id IS NOT NULL
        GROUP BY r.agent_id, u.name
        ORDER BY average_rating DESC, total_ratings DESC
        LIMIT 5
      `, [instanceId, req.tenantId, periodDate.toISOString()]);

            res.json({
                success: true,
                stats: {
                    total: total,
                    average: stats?.average ? parseFloat(Number(stats.average).toFixed(2)) : 0,
                    nps: nps,
                    promoters: promoters,
                    passives: stats?.passives || 0,
                    detractors: detractors,
                    topAgents: topAgents.map((a: any) => ({
                        agentId: a.agent_id,
                        agentName: a.agent_name,
                        totalRatings: a.total_ratings,
                        averageRating: parseFloat(Number(a.average_rating).toFixed(2))
                    }))
                }
            });
        } catch (error) {
            logger.error('Erro ao buscar estatísticas', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });

    // PUT /api/conversations/:conversationId/close - Close conversation and trigger rating
    router.put('/conversations/:conversationId/close', async (req: AuthRequest, res: Response) => {
        try {
            const { conversationId } = req.params;
            const { instanceId } = req.body;

            if (!instanceId) {
                res.status(400).json({ success: false, error: 'instanceId é obrigatório' });
                return;
            }

            // Update conversation status
            await database.run(`
        UPDATE web_conversations 
        SET status = 'closed', closed_at = ?, closed_by = ?
        WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [new Date().toISOString(), req.userId, conversationId, instanceId, req.tenantId]);

            // Emit socket event
            const io = getSocketIO();
            if (io) {
                io.to(`instance:${instanceId}`).emit('conversation:closed', {
                    conversationId,
                    closedBy: req.userId,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                message: 'Conversa encerrada. Pesquisa de satisfação será enviada ao cliente.'
            });
        } catch (error) {
            logger.error('Erro ao fechar conversa', error as Error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    });
    return router;
}
