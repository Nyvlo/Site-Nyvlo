import { Router, Response } from 'express';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createConversationsRoutes(
  database: DatabaseService,
  logger: LogService,
  getWhatsAppManager: () => any,
  getSocketIO: () => any
): Router {
  const router = Router();

  // Apply auth middleware to all routes
  router.use(authMiddleware);

  // GET /api/instances/:instanceId/conversations - List conversations for instance
  router.get('/:instanceId/conversations', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId } = req.params;
      const { archived, search, limit = '200' } = req.query;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const isPostgres = database.getType() === 'postgres';
      const jsonObjectFunc = isPostgres ? 'json_build_object' : 'json_object';
      const jsonAggFunc = isPostgres ? 'json_agg' : 'json_group_array';

      let query = `
        SELECT 
          wc.id,
          wc.instance_id,
          wc.whatsapp_chat_id,
          wc.type,
          wc.name,
          wc.profile_picture,
          wc.is_archived,
          wc.is_pinned,
          wc.unread_count,
          wc.updated_at,
          (
            SELECT ${jsonObjectFunc}(
              'id', m.id,
              'content', m.content,
              'type', m.type,
              'timestamp', m.timestamp,
              'isFromMe', m.is_from_me
            )
            FROM web_messages m 
            WHERE m.conversation_id = wc.id 
            ORDER BY m.timestamp DESC 
            LIMIT 1
          ) as last_message,
          (
            SELECT ${isPostgres ? `json_agg(${jsonObjectFunc}('id', l.id, 'name', l.name, 'color', l.color))` : `json_group_array(json_object('id', l.id, 'name', l.name, 'color', l.color))`}
            FROM web_labels l
            JOIN web_conversation_labels wcl ON l.id = wcl.label_id
            WHERE wcl.conversation_id = wc.id
          ) as labels
        FROM web_conversations wc
        WHERE wc.instance_id = ? AND wc.tenant_id = ?
      `;

      const params: any[] = [instanceId, req.tenantId];

      if (archived === 'true') {
        query += ' AND wc.is_archived = 1';
      } else if (archived === 'false') {
        query += ' AND wc.is_archived = 0';
      }

      if (search) {
        query += ' AND (wc.name LIKE ? OR wc.whatsapp_chat_id LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY wc.is_pinned DESC, wc.updated_at DESC LIMIT ?';
      params.push(parseInt(limit as string));

      const conversations = await database.all(query, params);

      res.json({
        success: true,
        conversations: conversations.map((c: any) => ({
          ...c,
          lastMessage: typeof c.last_message === 'string' ? JSON.parse(c.last_message) : c.last_message,
          labels: typeof c.labels === 'string' ? JSON.parse(c.labels) : (c.labels || []),
          isArchived: !!c.is_archived,
          isPinned: !!c.is_pinned
        }))
      });
    } catch (error) {
      logger.error('Erro ao listar conversas', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:instanceId/conversations/:conversationId - Get conversation details
  router.get('/:instanceId/conversations/:conversationId', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, conversationId } = req.params;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const conversation = await database.get<any>(`
        SELECT * FROM web_conversations 
        WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [conversationId, instanceId, req.tenantId]);

      if (!conversation) {
        res.status(404).json({ success: false, error: 'Conversa não encontrada' });
        return;
      }

      res.json({
        success: true,
        conversation: {
          ...conversation,
          isArchived: !!conversation.is_archived,
          isPinned: !!conversation.is_pinned
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar conversa', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/instances/:instanceId/conversations/:conversationId/messages - Get messages
  router.get('/:instanceId/conversations/:conversationId/messages', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, conversationId } = req.params;
      const { before, limit = '50' } = req.query;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      let query = `
        SELECT 
          m.id,
          m.conversation_id as "conversationId",
          m.whatsapp_message_id as "whatsappMessageId",
          m.sender_id as "senderId",
          m.sender_name as "senderName",
          m.type,
          m.content,
          m.media_url as "mediaUrl",
          m.media_metadata as "mediaMetadata",
          m.reply_to_id as "replyTo",
          m.status_sent as "statusSent",
          m.status_delivered as "statusDelivered",
          m.status_read as "statusRead",
          m.timestamp,
          m.is_from_me as "isFromMe",
          m.is_starred as "isStarred"
        FROM web_messages m
        WHERE m.conversation_id = ? AND m.tenant_id = ?
      `;

      const params: any[] = [conversationId, req.tenantId];

      if (before) {
        query += ' AND m.timestamp < ?';
        params.push(before);
      }

      query += ' ORDER BY m.timestamp DESC LIMIT ?';
      params.push(parseInt(limit as string));

      const messages = await database.all(query, params);

      // Reverse to get chronological order
      messages.reverse();

      res.json({
        success: true,
        messages: messages.map((m: any) => ({
          ...m,
          mediaMetadata: typeof m.mediaMetadata === 'string' ? JSON.parse(m.mediaMetadata) : m.mediaMetadata,
          status: {
            sent: !!m.statusSent,
            delivered: !!m.statusDelivered,
            read: !!m.statusRead
          },
          isFromMe: !!m.isFromMe,
          isStarred: !!m.isStarred,
          isInternal: !!m.is_internal
        }))
      });
    } catch (error) {
      logger.error('Erro ao listar mensagens', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // POST /api/instances/:instanceId/conversations/:conversationId/messages - Send message
  router.post('/:instanceId/conversations/:conversationId/messages', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, conversationId } = req.params;
      const { type = 'text', content, mediaUrl, replyTo, isInternal } = req.body;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      if (!content && !mediaUrl) {
        res.status(400).json({ success: false, error: 'Conteúdo ou mídia é obrigatório' });
        return;
      }

      // Get conversation to find WhatsApp chat ID
      const conversation = await database.get<any>(`
        SELECT whatsapp_chat_id FROM web_conversations 
        WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [conversationId, instanceId, req.tenantId]);

      if (!conversation) {
        res.status(404).json({ success: false, error: 'Conversa não encontrada' });
        return;
      }

      const whatsappManager = getWhatsAppManager();

      if (!whatsappManager) {
        res.status(500).json({ success: false, error: 'Gerenciador WhatsApp não disponível' });
        return;
      }

      // Send message via WhatsApp
      let messageId: string | null = null;
      let internalId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      if (isInternal) {
        messageId = internalId;
      } else if (type === 'text') {
        messageId = await whatsappManager.sendMessage(instanceId, conversation.whatsapp_chat_id, content);
      } else {
        // For media messages, we'll need to implement media sending
        messageId = await whatsappManager.sendMessage(instanceId, conversation.whatsapp_chat_id, content);
      }

      // Save message to database
      const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      await database.run(`
        INSERT INTO web_messages (
          id, conversation_id, whatsapp_message_id, sender_id, sender_name,
          type, content, media_url, reply_to_id, status_sent, is_from_me, timestamp, is_internal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        req.tenantId,

        conversationId,
        isInternal ? null : messageId, // whatsapp_message_id is null for internal messages
        req.userId,
        req.userRole || 'admin', // Use user role or 'admin' as sender name for internal messages
        type,
        content,
        mediaUrl || null,
        replyTo || null,
        isInternal ? 1 : 1, // status_sent is always 1 for messages sent from the app
        1, // is_from_me is always 1 for messages sent from the app
        timestamp,
        isInternal ? 1 : 0
      ]);

      // Update conversation
      await database.run(`
        UPDATE web_conversations 
        SET updated_at = ? 
        WHERE id = ?
      `, [timestamp, conversationId]);

      logger.info('Mensagem enviada', {
        conversationId,
        instanceId,
        userId: req.userId,
        type,
        isInternal
      });

      const newMessage = {
        id,
        conversationId,
        whatsappMessageId: isInternal ? null : messageId,
        senderId: req.userId,
        senderName: req.userRole || 'admin',
        type,
        content,
        mediaUrl,
        timestamp,
        isFromMe: true,
        isStarred: false,
        isInternal: !!isInternal,
        status: { sent: true, delivered: isInternal, read: isInternal }
      };

      // Emit via socket
      const io = getSocketIO();
      if (io) {
        io.to(`instance:${instanceId}`).emit('message:new', newMessage);
      }

      res.json({
        success: true,
        message: newMessage
      });
    } catch (error) {
      logger.error('Erro ao enviar mensagem', error as Error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // PUT /api/instances/:instanceId/conversations/:conversationId/archive - Archive/unarchive
  router.put('/:instanceId/conversations/:conversationId/archive', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, conversationId } = req.params;
      const { archived } = req.body;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      await database.run(`
        UPDATE web_conversations 
        SET is_archived = ? 
        WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [archived ? 1 : 0, conversationId, instanceId, req.tenantId]);

      res.json({ success: true, archived: !!archived });
    } catch (error) {
      logger.error('Erro ao arquivar conversa', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // PUT /api/instances/:instanceId/conversations/:conversationId/pin - Pin/unpin
  router.put('/:instanceId/conversations/:conversationId/pin', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, conversationId } = req.params;
      const { pinned } = req.body;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      await database.run(`
        UPDATE web_conversations 
        SET is_pinned = ? 
        WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [pinned ? 1 : 0, conversationId, instanceId, req.tenantId]);

      res.json({ success: true, pinned: !!pinned });
    } catch (error) {
      logger.error('Erro ao fixar conversa', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // PUT /api/instances/:instanceId/conversations/:conversationId/read - Mark as read
  router.put('/:instanceId/conversations/:conversationId/read', async (req: AuthRequest, res: Response) => {
    try {
      const { instanceId, conversationId } = req.params;

      // Check permission
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.allowedInstances && !req.allowedInstances.includes(instanceId) && !req.allowedInstances.includes('*')) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      await database.run(`
        UPDATE web_conversations 
        SET unread_count = 0 
        WHERE id = ? AND instance_id = ? AND tenant_id = ?
      `, [conversationId, instanceId, req.tenantId]);

      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao marcar como lida', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // PUT /api/instances/:instanceId/conversations/:conversationId/labels - Manage labels
  router.put('/:instanceId/conversations/:conversationId/labels', async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.params;
      const { labelIds } = req.body; // Array of label IDs

      await database.transaction(async () => {
        // Remove old labels
        await database.run('DELETE FROM web_conversation_labels WHERE conversation_id = ? AND tenant_id = ?', [conversationId, req.tenantId]);

        // Add new labels
        for (const labelId of labelIds) {
          await database.run('INSERT INTO web_conversation_labels (tenant_id, conversation_id, label_id) VALUES (?, ?, ?)', [req.tenantId, conversationId, labelId]);
        }
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao atualizar etiquetas da conversa', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // POST /api/instances/:instanceId/conversations/:conversationId/messages/:messageId/star - Star/unstar message
  router.post('/:instanceId/conversations/:conversationId/messages/:messageId/star', async (req: AuthRequest, res: Response) => {
    try {
      const { messageId } = req.params;
      const { starred } = req.body;

      await database.run('UPDATE web_messages SET is_starred = ? WHERE id = ? AND tenant_id = ?', [starred ? 1 : 0, messageId, req.tenantId]);

      res.json({ success: true, starred: !!starred });
    } catch (error) {
      logger.error('Erro ao favoritar mensagem', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });
  // GET /api/instances/:instanceId/conversations/:conversationId/custom-fields
  router.get('/:instanceId/conversations/:conversationId/custom-fields', async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.params;

      // We need contact_id. Conversations table has it? No, but we can derive it or link via whatsapp_chat_id
      const conversation = await database.get<any>('SELECT whatsapp_chat_id FROM web_conversations WHERE id = ?', [conversationId]);
      if (!conversation) return res.status(404).json({ success: false, error: 'Conversa não encontrada' });

      const fields = await database.all(`
        SELECT f.* FROM web_contact_custom_fields f
        JOIN web_contacts c ON f.contact_id = c.id
        WHERE c.whatsapp_id = ?
      `, [conversation.whatsapp_chat_id]);

      res.json({ success: true, fields });
    } catch (error) {
      logger.error('Erro ao buscar campos customizados', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // POST /api/instances/:instanceId/conversations/:conversationId/custom-fields
  router.post('/:instanceId/conversations/:conversationId/custom-fields', async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.params;
      const { fields } = req.body; // Array of { key, value }

      const conversation = await database.get<any>('SELECT whatsapp_chat_id, instance_id FROM web_conversations WHERE id = ?', [conversationId]);
      if (!conversation) return res.status(404).json({ success: false, error: 'Conversa não encontrada' });

      // Find or create contact
      let contact = await database.get<any>('SELECT id FROM web_contacts WHERE whatsapp_id = ?', [conversation.whatsapp_chat_id]);
      if (!contact) {
        const contactId = `cont_${Date.now()}`;
        await database.run('INSERT INTO web_contacts (id, instance_id, whatsapp_id) VALUES (?, ?, ?)', [contactId, conversation.instance_id, conversation.whatsapp_chat_id]);
        contact = { id: contactId };
      }

      await database.transaction(async () => {
        // Simplified approach: delete and re-insert
        await database.run('DELETE FROM web_contact_custom_fields WHERE contact_id = ?', [contact.id]);

        for (const f of fields) {
          await database.run(`
            INSERT INTO web_contact_custom_fields (id, contact_id, field_key, field_value)
            VALUES (?, ?, ?, ?)
          `, [`cf_${contact.id}_${f.key}`, contact.id, f.key, f.value]);
        }
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao salvar campos customizados', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // PUT /api/instances/:instanceId/conversations/:conversationId/assign - Assign conversation to agent
  router.put('/:instanceId/conversations/:conversationId/assign', async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId, instanceId } = req.params;
      const { agentId } = req.body;

      // Only admins can assign conversations
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Apenas administradores podem atribuir conversas' });
        return;
      }

      // Validate agent exists
      if (agentId) {
        const agent = await database.get('SELECT id FROM web_users WHERE id = ? AND role = ?', [agentId, 'agent']);
        if (!agent) {
          res.status(404).json({ success: false, error: 'Agente não encontrado' });
          return;
        }
      }

      // Update conversation
      await database.run(`
        UPDATE web_conversations 
        SET assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND instance_id = ?
      `, [agentId || null, conversationId, instanceId]);

      // Emit socket event
      const io = getSocketIO();
      if (io) {
        io.to(`instance:${instanceId}`).emit('conversation:assigned', {
          conversationId,
          agentId,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ success: true, agentId });
    } catch (error) {
      logger.error('Erro ao atribuir conversa', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  return router;
}
