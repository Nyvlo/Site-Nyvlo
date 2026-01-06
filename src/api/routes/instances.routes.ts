import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createInstancesRoutes(
  database: DatabaseService,
  logger: LogService,
  getWhatsAppManager: () => any
): Router {
  const router = Router();

  // Apply auth middleware to all routes
  router.use(authMiddleware);

  // GET /api/instances - List all instances for user
  router.get('/', async (req: AuthRequest, res: Response) => {
    try {
      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.json({ success: true, instances: [] });
        return;
      }

      let instances = whatsappManager.getInstances(req.tenantId);

      // Filter by user permissions if not admin
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances) {
        const allowed = req.allowedInstances;
        if (allowed.length > 0 && !allowed.includes('*')) {
          instances = instances.filter((i: any) => allowed.includes(i.id));
        }
      }

      res.json({
        success: true,
        instances: instances.map((i: any) => ({
          id: i.id,
          name: i.name,
          phoneNumber: i.phoneNumber || '',
          status: i.status,
          lastSeen: i.lastSeen
        }))
      });
    } catch (error) {
      logger.error('Erro ao listar instâncias', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:id - Get instance details
  router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.status(404).json({ success: false, error: 'Instância não encontrada' });
        return;
      }

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(id) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const instance = whatsappManager.getInstance(id);

      if (!instance || (req.tenantId && instance.tenantId !== req.tenantId)) {
        res.status(404).json({ success: false, error: 'Instância não encontrada' });
        return;
      }

      res.json({
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          phoneNumber: instance.phoneNumber || '',
          status: instance.status,
          qrCode: instance.qrCode,
          lastSeen: instance.lastSeen
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar instância', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // POST /api/instances - Create new instance (admin only)
  router.post('/', async (req: AuthRequest, res: Response) => {
    try {
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const { name } = req.body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Nome é obrigatório' });
        return;
      }

      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.status(500).json({ success: false, error: 'Gerenciador WhatsApp não disponível' });
        return;
      }

      // Check plan limits
      const tenant = await database.get<any>('SELECT plan_id, max_instances FROM tenants WHERE id = ?', [req.tenantId]);
      const currentInstances = whatsappManager.getInstances(req.tenantId);

      const maxAllowed = tenant?.max_instances || 1;

      if (currentInstances.length >= maxAllowed) {
        res.status(403).json({
          success: false,
          error: `Limite de instâncias atingido (${maxAllowed}). Faça um upgrade de plano.`
        });
        return;
      }

      const instanceId = await whatsappManager.createInstance(name, req.tenantId);
      const instance = whatsappManager.getInstance(instanceId);

      logger.info('Instância criada', { instanceId, name, createdBy: req.userId });

      res.status(201).json({
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          status: instance.status
        }
      });
    } catch (error) {
      logger.error('Erro ao criar instância', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // POST /api/instances/:id/connect - Connect instance
  router.post('/:id/connect', async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(id) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.status(500).json({ success: false, error: 'Gerenciador WhatsApp não disponível' });
        return;
      }

      await whatsappManager.connectInstance(id);
      const instance = whatsappManager.getInstance(id);

      logger.info('Instância conectando', { instanceId: id, userId: req.userId });

      res.json({
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          status: instance.status,
          qrCode: instance.qrCode
        }
      });
    } catch (error) {
      logger.error('Erro ao conectar instância', error as Error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // POST /api/instances/:id/disconnect - Disconnect instance
  router.post('/:id/disconnect', async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(id) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.status(500).json({ success: false, error: 'Gerenciador WhatsApp não disponível' });
        return;
      }

      await whatsappManager.disconnectInstance(id);
      const instance = whatsappManager.getInstance(id);

      logger.info('Instância desconectada', { instanceId: id, userId: req.userId });

      res.json({
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          status: instance.status
        }
      });
    } catch (error) {
      logger.error('Erro ao desconectar instância', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // DELETE /api/instances/:id - Delete instance (admin only)
  router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const { id } = req.params;
      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.status(500).json({ success: false, error: 'Gerenciador WhatsApp não disponível' });
        return;
      }

      await whatsappManager.deleteInstance(id);

      logger.info('Instância deletada', { instanceId: id, deletedBy: req.userId });

      res.json({ success: true, message: 'Instância deletada com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar instância', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:id/qr - Get QR code
  router.get('/:id/qr', (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(id) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.json({ success: true, qrCode: null });
        return;
      }

      const instance = whatsappManager.getInstance(id);
      logger.info(`Busca de QR Code para instância ${id}: ${instance?.qrCode ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);

      res.json({
        success: true,
        qrCode: instance?.qrCode || null
      });
    } catch (error) {
      logger.error('Erro ao obter QR code', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  return router;
}
