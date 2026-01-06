import { BaileysAdapter } from '../adapters/baileys-adapter';
import { BotConfig } from '../types/config';
import { LogService } from './log-service';
import { DatabaseService } from './database-service';
import { EventEmitter } from 'events';

export interface WhatsAppInstance {
  id: string;
  tenantId: string;
  useBridgeMode?: boolean;
  name: string;
  phone?: string;
  phoneNumber?: string; // Alias for phone
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  qrCode?: string;
  lastSeen?: Date;
  adapter?: BaileysAdapter;
  error?: string;
  isManualSend?: boolean;
}

export interface IncomingWhatsAppMessage {
  instanceId: string;
  conversationId: string;
  whatsappChatId: string;
  whatsappMessageId: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  content: string;
  mediaUrl?: string;
  timestamp: Date;
  isFromMe: boolean;
}

export class WhatsAppManager extends EventEmitter {
  private instances: Map<string, WhatsAppInstance> = new Map();
  private config: BotConfig;
  private logger: LogService;
  private database: DatabaseService;
  private messageHandler?: (instanceId: string, message: any) => Promise<void>;
  private webMessageHandler?: (message: IncomingWhatsAppMessage) => void;

  constructor(config: BotConfig, logger: LogService, database: DatabaseService) {
    super();
    this.config = config;
    this.logger = logger;
    this.database = database;
  }

  async initialize(): Promise<void> {
    await this.loadInstances();
  }

  private async loadInstances(): Promise<void> {
    const instances = await this.database.query<any>(`
      SELECT i.*, t.use_bridge_mode 
      FROM web_instances i 
      LEFT JOIN tenants t ON i.tenant_id = t.id
    `);

    for (const instance of instances) {
      this.instances.set(instance.id, {
        id: instance.id,
        tenantId: instance.tenant_id || 'system-default',
        useBridgeMode: !!instance.use_bridge_mode,
        name: instance.name,
        phone: instance.phone,
        status: 'disconnected'
      });
    }
  }

  async createInstance(name: string, tenantId: string = 'system-default'): Promise<string> {
    const id = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const instance: WhatsAppInstance = {
      id,
      tenantId,
      name,
      status: 'disconnected'
    };

    // Salvar no banco
    await this.database.run(
      'INSERT INTO web_instances (id, tenant_id, name, status) VALUES (?, ?, ?, ?)',
      [id, tenantId, name, 'disconnected']
    );

    this.instances.set(id, instance);
    this.emit('instanceCreated', instance);

    this.logger.info('Nova instância WhatsApp criada', { id, tenantId, name });
    return id;
  }

  async connectInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instância não encontrada');
    }

    if (instance.status === 'connected' || instance.status === 'connecting') {
      return;
    }

    try {
      instance.status = 'connecting';
      instance.error = undefined;
      await this.updateInstanceStatus(instanceId, 'connecting');
      this.emit('instanceStatusChanged', instance);

      // Criar adapter específico para esta instância
      const adapter = new BaileysAdapter(this.config, this.logger, instanceId);
      instance.adapter = adapter;

      // Configurar eventos do adapter
      adapter.onQRCode((qr) => {
        instance.qrCode = qr;
        this.emit('qrCodeGenerated', { instanceId, qrCode: qr });
        this.logger.info('QR Code gerado para instância', { instanceId });
      });

      adapter.onConnected(async (phone) => {
        instance.status = 'connected';
        instance.phone = phone;
        instance.lastSeen = new Date();
        instance.qrCode = undefined;
        await this.updateInstanceInDatabase(instance);
        this.emit('instanceStatusChanged', instance);
        this.logger.info('Instância conectada', { instanceId, phone });
      });

      adapter.onDisconnected(async () => {
        instance.status = 'disconnected';
        instance.qrCode = undefined;
        await this.updateInstanceStatus(instanceId, 'disconnected');
        this.emit('instanceStatusChanged', instance);
        this.logger.info('Instância desconectada', { instanceId });
      });

      adapter.onMessage(async (message) => {
        // Process for bot
        if (this.messageHandler) {
          await this.messageHandler(instanceId, message);
        }

        // Process for web interface
        await this.processWebMessage(instanceId, message);
      });

      adapter.onHistorySync(async (history) => {
        this.logger.info('Iniciando sincronização de histórico', { instanceId, chatsCount: history.chats.length });

        for (const chat of history.chats) {
          if (chat.messages) {
            for (const msg of chat.messages) {
              if (msg.message) {
                await this.processWebMessage(instanceId, msg, true);
              }
            }
          }
        }
        this.logger.info('Sincronização de histórico concluída', { instanceId });
      });

      adapter.onError(async (error) => {
        instance.status = 'error';
        instance.error = error.message;
        instance.qrCode = undefined;
        await this.updateInstanceStatus(instanceId, 'error');
        this.emit('instanceStatusChanged', instance);
        this.logger.error('Erro na instância WhatsApp', { instanceId, error });
      });

      // Conectar
      await adapter.connect();

    } catch (error) {
      instance.status = 'error';
      instance.error = (error as Error).message;
      await this.updateInstanceStatus(instanceId, 'error');
      this.emit('instanceStatusChanged', instance);
      this.logger.error('Erro ao conectar instância', { instanceId, error });
      throw error;
    }
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.adapter) {
      return;
    }

    try {
      await instance.adapter.disconnect();
      instance.status = 'disconnected';
      instance.qrCode = undefined;
      instance.adapter = undefined;
      await this.updateInstanceStatus(instanceId, 'disconnected');
      this.emit('instanceStatusChanged', instance);
      this.logger.info('Instância desconectada manualmente', { instanceId });
    } catch (error) {
      this.logger.error('Erro ao desconectar instância', { instanceId, error });
    }
  }

  async deleteInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    // Desconectar se estiver conectada
    if (instance.adapter) {
      await this.disconnectInstance(instanceId);
    }

    // Remover do banco
    await this.database.run('DELETE FROM web_instances WHERE id = ?', [instanceId]);

    // Remover pasta de autenticação
    try {
      const fs = await import('fs');
      const path = await import('path');
      const authPath = path.join(process.cwd(), `auth_info_${instanceId}`);
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        this.logger.info('Pasta de autenticação removida', { instanceId });
      }
    } catch (error) {
      this.logger.error('Erro ao remover pasta de autenticação', { instanceId, error });
    }

    // Remover da memória
    this.instances.delete(instanceId);
    this.emit('instanceDeleted', instanceId);
    this.logger.info('Instância removida', { instanceId });
  }

  async sendMessage(instanceId: string, to: string, message: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.adapter || instance.status !== 'connected') {
      throw new Error('Instância não conectada');
    }

    // Mark as manual send so processWebMessage knows it's an agent
    instance.isManualSend = true;
    await instance.adapter.sendText(to, message);
  }

  async downloadMedia(instanceId: string, msg: any): Promise<Buffer> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.adapter) {
      throw new Error('Instância ou adaptador não encontrado');
    }
    return await instance.adapter.downloadMedia(msg);
  }

  async findMessage(instanceId: string, chatId: string, messageId: string): Promise<any> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.adapter) {
      return null;
    }
    return await instance.adapter.findMessage(chatId, messageId);
  }

  getInstances(tenantId?: string): WhatsAppInstance[] {
    let instances = Array.from(this.instances.values());

    if (tenantId) {
      instances = instances.filter(i => i.tenantId === tenantId);
    }

    return instances.map(instance => ({
      ...instance,
      adapter: undefined // Não expor o adapter
    }));
  }


  getInstance(instanceId: string): WhatsAppInstance | undefined {
    const instance = this.instances.get(instanceId);
    if (!instance) return undefined;

    return {
      ...instance,
      adapter: undefined // Não expor o adapter
    };
  }

  getConnectedInstances(): WhatsAppInstance[] {
    return this.getInstances().filter(instance => instance.status === 'connected');
  }

  setMessageHandler(handler: (instanceId: string, message: any) => Promise<void>): void {
    this.messageHandler = handler;
  }

  setWebMessageHandler(handler: (message: IncomingWhatsAppMessage) => void): void {
    this.webMessageHandler = handler;
  }

  private async processWebMessage(instanceId: string, message: any, isHistory: boolean = false): Promise<void> {
    try {
      const chatId = message.key?.remoteJid || message.from;
      if (!chatId) return;

      const isFromMe = message.key?.fromMe || message.isFromMe || message.fromMe || false;
      const messageId = message.key?.id || message.id || `msg_${Date.now()}`;
      const participant = message.key?.participant || message.participant;
      const pushName = message.pushName || (isFromMe ? 'Você' : undefined);

      // Skip status broadcast
      if (chatId === 'status@broadcast') return;

      // Check if message already exists
      const existingMessage = await this.database.get<any>(
        'SELECT id FROM web_messages WHERE whatsapp_message_id = ?',
        [messageId]
      );

      if (existingMessage) return;

      const instance = this.instances.get(instanceId);
      const tenantId = instance?.tenantId || 'system-default';

      // Find or create conversation
      let conversation = await this.database.get<any>(
        'SELECT id FROM web_conversations WHERE tenant_id = ? AND instance_id = ? AND whatsapp_chat_id = ?',
        [tenantId, instanceId, chatId]
      );

      if (!conversation) {
        // Create new conversation
        const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const timestamp = new Date().toISOString();
        const isGroup = chatId.includes('@g.us');

        await this.database.run(`
          INSERT INTO web_conversations (
            id, tenant_id, instance_id, whatsapp_chat_id, type, name, unread_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          convId,
          tenantId,
          instanceId,
          chatId,
          isGroup ? 'group' : 'individual',
          pushName || chatId.split('@')[0],
          isFromMe || isHistory ? 0 : 1,
          timestamp,
          timestamp
        ]);

        conversation = { id: convId };
      } else if (!isFromMe && !isHistory) {
        // Increment unread count
        await this.database.run(`
          UPDATE web_conversations 
          SET unread_count = unread_count + 1, updated_at = ?
          WHERE id = ?
        `, [new Date().toISOString(), conversation.id]);
      }

      // Determine message type
      let msgType = 'text';
      let content = message.text || '';
      let mediaUrl = null;

      // Handle Baileys proto message structure if present
      const m = message.message || message;
      if (m.conversation) {
        content = m.conversation;
      } else if (m.extendedTextMessage?.text) {
        content = m.extendedTextMessage.text;
      } else if (m.imageMessage) {
        msgType = 'image';
        content = m.imageMessage.caption || '';
      } else if (m.videoMessage) {
        msgType = 'video';
        content = m.videoMessage.caption || '';
      } else if (m.audioMessage) {
        msgType = 'audio';
      } else if (m.documentMessage) {
        msgType = 'document';
        content = m.documentMessage.fileName || m.documentMessage.caption || '';
      } else if (m.stickerMessage) {
        msgType = 'sticker';
      }

      // If content is still empty and it's from Baileys adapter parse
      if (!content && message.text) content = message.text;

      // Save message (SKIP if in Bridge Mode)
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const timestamp = message.messageTimestamp
        ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      if (!instance?.useBridgeMode) {
        await this.database.run(`
          INSERT INTO web_messages (
            id, tenant_id, conversation_id, whatsapp_message_id, sender_id, sender_name,
            type, content, media_url, status_sent, status_delivered, is_from_me, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          msgId,
          tenantId,
          conversation.id,
          messageId,
          participant || chatId,
          pushName || (participant || chatId).split('@')[0],
          msgType,
          content,
          mediaUrl,
          1,
          1,
          isFromMe ? 1 : 0,
          timestamp
        ]);

        // Update conversation timestamp
        await this.database.run('UPDATE web_conversations SET updated_at = ? WHERE id = ?', [timestamp, conversation.id]);
      } else {
        this.logger.debug('Modo Bridge Ativo: Pulando salvamento de mensagem no banco', { messageId });
      }

      // Upsert Customer Base
      if (!isHistory) {
        await this.database.upsertCustomer(tenantId, chatId, {
          name: pushName || chatId.split('@')[0],
          isAI: isFromMe && !instance?.isManualSend,
          isAgent: isFromMe && !!instance?.isManualSend
        });

        // Reset manual send flag if it was set
        if (isFromMe && instance) {
          instance.isManualSend = false;
        }
      }

      // Emit event for Socket.io (only for new messages)
      if (!isHistory) {
        const webMessage: IncomingWhatsAppMessage = {
          instanceId,
          conversationId: conversation.id,
          whatsappChatId: chatId,
          whatsappMessageId: messageId,
          senderId: participant || chatId,
          senderName: pushName || (participant || chatId).split('@')[0],
          type: msgType as any,
          content,
          mediaUrl: mediaUrl || undefined,
          timestamp: new Date(timestamp),
          isFromMe
        };

        this.emit('webMessage', webMessage);

        if (this.webMessageHandler) {
          this.webMessageHandler(webMessage);
        }
      }

    } catch (error) {
      this.logger.error('Erro ao processar mensagem para web', error as Error);
    }
  }

  private async updateInstanceStatus(instanceId: string, status: string): Promise<void> {
    await this.database.run(`
      UPDATE web_instances 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [status, instanceId]);
  }

  private async updateInstanceInDatabase(instance: WhatsAppInstance): Promise<void> {
    await this.database.run(`
      UPDATE web_instances 
      SET phone = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [instance.phone, instance.status, instance.id]);
  }

  async getStats(): Promise<{
    total: number;
    connected: number;
    connecting: number;
    disconnected: number;
    error: number;
  }> {
    const instances = this.getInstances();

    return {
      total: instances.length,
      connected: instances.filter(i => i.status === 'connected').length,
      connecting: instances.filter(i => i.status === 'connecting').length,
      disconnected: instances.filter(i => i.status === 'disconnected').length,
      error: instances.filter(i => i.status === 'error').length
    };
  }
}