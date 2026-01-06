import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createContactsRoutes(
  database: DatabaseService,
  logger: LogService,
  getWhatsAppManager: () => any
): Router {
  const router = Router();

  router.use(authMiddleware);

  // GET /api/instances/:instanceId/contacts - List contacts
  router.get('/:instanceId/contacts', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId } = req.params;
      const { search, limit = '100' } = req.query;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId)) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      let query = `
        SELECT * FROM web_contacts
        WHERE instance_id = ? AND tenant_id = ?
      `;
      const params: any[] = [instanceId, req.tenantId];

      if (search) {
        query += ' AND (name LIKE ? OR push_name LIKE ? OR phone_number LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY name ASC LIMIT ?';
      params.push(parseInt(limit as string));

      const contacts = await database.all(query, params);

      res.json({
        success: true,
        contacts: contacts.map((c: any) => ({
          ...c,
          isBusiness: !!c.is_business
        }))
      });
    } catch (error) {
      logger.error('Erro ao listar contatos', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:instanceId/contacts/:contactId - Get contact details
  router.get('/:instanceId/contacts/:contactId', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, contactId } = req.params;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId)) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const contact = await database.get<any>(`
        SELECT * FROM web_contacts WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [contactId, instanceId, req.tenantId]);

      if (!contact) {
        res.status(404).json({ success: false, error: 'Contato não encontrado' });
        return;
      }

      // Get shared media count
      const mediaCount = await database.get<any>(`
        SELECT 
          COUNT(CASE WHEN type = 'image' THEN 1 END) as images,
          COUNT(CASE WHEN type = 'video' THEN 1 END) as videos,
          COUNT(CASE WHEN type = 'document' THEN 1 END) as documents,
          COUNT(CASE WHEN type = 'audio' THEN 1 END) as audios
        FROM web_messages m
        JOIN web_conversations c ON m.conversation_id = c.id
        WHERE c.whatsapp_chat_id = ? AND c.instance_id = ? AND c.tenant_id = ?
      `, [contact.whatsapp_id, instanceId, req.tenantId]);

      res.json({
        success: true,
        contact: {
          ...contact,
          isBusiness: !!contact.is_business,
          sharedMedia: mediaCount || { images: 0, videos: 0, documents: 0, audios: 0 }
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar contato', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // PUT /api/instances/:instanceId/contacts/:contactId - Update contact notes
  router.put('/:instanceId/contacts/:contactId', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, contactId } = req.params;
      const { name, notes } = req.body;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId)) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      await database.run(`
        UPDATE web_contacts 
        SET name = COALESCE(?, name), notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [name || null, notes, contactId, instanceId, req.tenantId]);

      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao atualizar contato', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:instanceId/contacts/:contactId/media - Get shared media
  router.get('/:instanceId/contacts/:contactId/media', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, contactId } = req.params;
      const { type, limit = '50' } = req.query;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId)) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const contact = await database.get<any>(`
        SELECT whatsapp_id FROM web_contacts WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [contactId, instanceId, req.tenantId]);

      if (!contact) {
        res.status(404).json({ success: false, error: 'Contato não encontrado' });
        return;
      }

      let query = `
        SELECT m.id, m.type, m.content, m.media_url as "mediaUrl", m.media_metadata as "mediaMetadata", m.timestamp
        FROM web_messages m
        JOIN web_conversations c ON m.conversation_id = c.id
        WHERE c.whatsapp_chat_id = ? AND c.instance_id = ? AND c.tenant_id = ?
        AND m.type IN ('image', 'video', 'document', 'audio')
      `;
      const params: any[] = [contact.whatsapp_id, instanceId, req.tenantId];

      if (type) {
        query += ' AND m.type = ?';
        params.push(type);
      }

      query += ' ORDER BY m.timestamp DESC LIMIT ?';
      params.push(parseInt(limit as string));

      const media = await database.all(query, params);

      res.json({
        success: true,
        media: media.map((m: any) => ({
          ...m,
          mediaMetadata: typeof m.mediaMetadata === 'string' ? JSON.parse(m.mediaMetadata) : m.mediaMetadata
        }))
      });
    } catch (error) {
      logger.error('Erro ao buscar mídia compartilhada', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:instanceId/groups - List groups
  router.get('/:instanceId/groups', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId } = req.params;
      const { search, limit = '50' } = req.query;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId)) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      let query = `
        SELECT 
          c.id,
          c.whatsapp_chat_id as "whatsappChatId",
          c.name,
          c.profile_picture as "profilePicture",
          c.is_archived as "isArchived",
          c.is_pinned as "isPinned",
          c.updated_at as "updatedAt"
        FROM web_conversations c
        WHERE c.instance_id = ? AND c.type = 'group' AND c.tenant_id = ?
      `;
      const params: any[] = [instanceId, req.tenantId];

      if (search) {
        query += ' AND c.name LIKE ?';
        params.push(`%${search}%`);
      }

      query += ' ORDER BY c.name ASC LIMIT ?';
      params.push(parseInt(limit as string));

      const groups = await database.all(query, params);

      res.json({
        success: true,
        groups: groups.map((g: any) => ({
          ...g,
          isArchived: !!g.isArchived,
          isPinned: !!g.isPinned
        }))
      });
    } catch (error) {
      logger.error('Erro ao listar grupos', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:instanceId/groups/:groupId - Get group details with participants
  router.get('/:instanceId/groups/:groupId', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, groupId } = req.params;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId)) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const group = await database.get<any>(`
        SELECT * FROM web_conversations 
        WHERE id = ? AND instance_id = ? AND type = 'group' AND tenant_id = ?
      `, [groupId, instanceId, req.tenantId]);

      if (!group) {
        res.status(404).json({ success: false, error: 'Grupo não encontrado' });
        return;
      }

      // Get participants
      const participants = await database.all(`
        SELECT * FROM web_group_participants WHERE group_id = ? AND tenant_id = ?
        ORDER BY is_super_admin DESC, is_admin DESC, name ASC
      `, [groupId, req.tenantId]);

      // Get shared media count
      const mediaCount = await database.get<any>(`
        SELECT 
          COUNT(CASE WHEN type = 'image' THEN 1 END) as images,
          COUNT(CASE WHEN type = 'video' THEN 1 END) as videos,
          COUNT(CASE WHEN type = 'document' THEN 1 END) as documents
        FROM web_messages WHERE conversation_id = ? AND tenant_id = ?
      `, [groupId, req.tenantId]);

      res.json({
        success: true,
        group: {
          ...group,
          isArchived: !!group.is_archived,
          isPinned: !!group.is_pinned,
          participants: participants.map((p: any) => ({
            ...p,
            isAdmin: !!p.is_admin,
            isSuperAdmin: !!p.is_super_admin
          })),
          participantCount: participants.length,
          sharedMedia: mediaCount || { images: 0, videos: 0, documents: 0 }
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar grupo', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:instanceId/groups/:groupId/media - Get group shared media
  router.get('/:instanceId/groups/:groupId/media', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, groupId } = req.params;
      const { type, limit = '50' } = req.query;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId)) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      let query = `
        SELECT id, type, content, media_url as "mediaUrl", media_metadata as "mediaMetadata", timestamp, sender_name as "senderName"
        FROM web_messages
        WHERE conversation_id = ? AND tenant_id = ?
        AND type IN ('image', 'video', 'document', 'audio')
      `;
      const params: any[] = [groupId, req.tenantId];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(parseInt(limit as string));

      const media = await database.all(query, params);

      res.json({
        success: true,
        media: media.map((m: any) => ({
          ...m,
          mediaMetadata: typeof m.mediaMetadata === 'string' ? JSON.parse(m.mediaMetadata) : m.mediaMetadata
        }))
      });
    } catch (error) {
      logger.error('Erro ao buscar mídia do grupo', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  return router;
}
