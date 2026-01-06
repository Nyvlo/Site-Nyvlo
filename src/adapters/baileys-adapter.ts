import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
// @ts-ignore
import * as qrcode from 'qrcode-terminal';
import pino from 'pino';
import { BotConfig } from '../types/config';
import { IncomingMessage, MenuOption, MessageType } from '../types/messages';
import { LogService } from '../services/log-service';

export class BaileysAdapter {
  private socket: WASocket | null = null;
  private config: BotConfig;
  private logger: LogService;
  private instanceId: string;
  private messageHandler: ((message: IncomingMessage) => void) | null = null;
  private qrCallback: ((qr: string) => void) | null = null;
  private connectedCallback: ((phone: string) => void) | null = null;
  private disconnectedCallback: (() => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private historyCallback: ((history: { chats: any[] }) => void) | null = null;
  private reconnectAttempts: number = 0;
  private isConnected: boolean = false;
  private isExplicitlyClosed: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageCache: Map<string, proto.IWebMessageInfo> = new Map();
  private maxCacheSize: number = 1000;

  constructor(config: BotConfig, logger: LogService, instanceId: string = 'default') {
    this.config = config;
    this.logger = logger;
    this.instanceId = instanceId;
  }

  async connect(): Promise<void> {
    const authPath = `auth_info_${this.instanceId}`;
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    this.isExplicitlyClosed = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Fetch latest version for better compatibility
    const { version } = await fetchLatestBaileysVersion();
    this.logger.info(`Usando Baileys versão: ${version.join('.')} para instância ${this.instanceId}`);

    // Create silent logger for Baileys internal logs
    const baileysLogger = pino({ level: 'silent' });

    this.socket = makeWASocket({
      auth: state,
      browser: ['Nyvlo Omnichannel Bot', 'Chrome', '120.0.0'],
      version,
      logger: baileysLogger,
      printQRInTerminal: false, // We handle QR manually
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      markOnlineOnConnect: true,
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.info(`QR Code gerado para instância ${this.instanceId}`);
        if (this.qrCallback) {
          this.qrCallback(qr);
        } else {
          // Fallback para console se não houver callback
          console.log(`\n========================================`);
          console.log(`   QR CODE PARA INSTÂNCIA: ${this.instanceId}`);
          console.log(`========================================\n`);
          qrcode.generate(qr, { small: true });
        }
      }

      if (connection === 'close') {
        this.isConnected = false;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const errorMessage = (lastDisconnect?.error as Boom)?.message || 'Erro desconhecido';

        this.logger.info(`Conexão fechada para instância ${this.instanceId}: ${errorMessage} (código: ${statusCode})`);

        if (statusCode === DisconnectReason.loggedOut) {
          this.logger.warn(`Instância ${this.instanceId} desconectada - usuário fez logout`);
          if (this.errorCallback) {
            this.errorCallback(new Error('Usuário fez logout'));
          }
          return;
        }

        if (this.disconnectedCallback) {
          this.disconnectedCallback();
        }

        // Don't reconnect if explicitly closed or logged out
        const shouldReconnect = !this.isExplicitlyClosed && statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect && this.reconnectAttempts < this.config.bot.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
          this.logger.info(`Tentando reconectar instância ${this.instanceId} (${this.reconnectAttempts}/${this.config.bot.maxReconnectAttempts}) em ${delay / 1000}s`);

          this.reconnectTimeout = setTimeout(() => this.connect(), delay);
        } else if (this.reconnectAttempts >= this.config.bot.maxReconnectAttempts) {
          this.logger.error(`Máximo de tentativas de reconexão atingido para instância ${this.instanceId}`);
          if (this.errorCallback) {
            this.errorCallback(new Error('Máximo de tentativas de reconexão atingido'));
          }
        }
      }

      if (connection === 'open') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        const phone = this.socket?.user?.id?.split(':')[0] || 'unknown';
        this.logger.info(`Instância ${this.instanceId} conectada! Número: ${phone}`);

        if (this.connectedCallback) {
          this.connectedCallback(phone);
        }
      }
    });

    this.socket.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        // Cache message for media tunnel
        if (msg.key.id) {
          const cacheKey = `${msg.key.remoteJid}:${msg.key.id}`;
          this.messageCache.set(cacheKey, msg);

          // Cleanup old messages
          if (this.messageCache.size > this.maxCacheSize) {
            const firstKey = this.messageCache.keys().next()?.value;
            if (firstKey) this.messageCache.delete(firstKey);
          }
        }

        if (msg.key.fromMe) continue;
        if (!msg.message) continue;

        const incomingMessage = this.parseMessage(msg);
        if (incomingMessage && this.messageHandler) {
          this.messageHandler(incomingMessage);
        }
      }
    });

    this.socket.ev.on('messaging-history.set', async (history) => {
      if (this.historyCallback) {
        this.historyCallback(history);
      }
    });
  }

  private parseMessage(msg: proto.IWebMessageInfo): IncomingMessage | null {
    const from = msg.key.remoteJid;
    if (!from) return null;

    let text = '';
    let messageType: MessageType = 'text';
    let mediaUrl: string | undefined;

    const message = msg.message;
    if (!message) return null;

    if (message.conversation) {
      text = message.conversation;
      messageType = 'text';
    } else if (message.extendedTextMessage?.text) {
      text = message.extendedTextMessage.text;
      messageType = 'text';
    } else if (message.imageMessage) {
      messageType = 'image';
      text = message.imageMessage.caption || '';
    } else if (message.documentMessage) {
      messageType = 'document';
      text = message.documentMessage.fileName || '';
    } else if (message.audioMessage) {
      messageType = 'audio';
    } else if (message.stickerMessage) {
      messageType = 'sticker';
    }

    return {
      from: from,
      participant: msg.key.participant || undefined,
      isFromMe: msg.key.fromMe || false,
      pushName: msg.pushName || undefined,
      text,
      timestamp: msg.messageTimestamp as number || Date.now(),
      messageType,
      mediaUrl
    } as any;
  }

  onMessage(handler: (message: IncomingMessage) => void): void {
    this.messageHandler = handler;
  }

  async sendText(to: string, message: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não conectado');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await this.socket.sendMessage(jid, { text: message });

    if (this.config.bot.messageDelay > 0) {
      await this.delay(this.config.bot.messageDelay);
    }
  }

  async sendList(to: string, title: string, options: MenuOption[]): Promise<void> {
    // WhatsApp lists are limited, so we format as numbered text
    let message = `${title}\n\n`;
    options.forEach((opt, index) => {
      message += `${index + 1}. ${opt.title}`;
      if (opt.description) {
        message += ` - ${opt.description}`;
      }
      message += '\n';
    });

    await this.sendText(to, message);
  }

  async sendMedia(to: string, filePath: string, caption?: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não conectado');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    const fs = await import('fs');
    const path = await import('path');

    const ext = path.extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);

    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      await this.socket.sendMessage(jid, {
        image: buffer,
        caption
      });
    } else if (ext === '.pdf') {
      await this.socket.sendMessage(jid, {
        document: buffer,
        mimetype: 'application/pdf',
        fileName: path.basename(filePath),
        caption
      });
    } else {
      await this.socket.sendMessage(jid, {
        document: buffer,
        mimetype: 'application/octet-stream',
        fileName: path.basename(filePath),
        caption
      });
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async downloadMedia(msg: proto.IWebMessageInfo): Promise<Buffer> {
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger: pino({ level: 'silent' }) as any,
        reuploadRequest: this.socket!.updateMediaMessage
      }
    );
    return buffer as Buffer;
  }

  async findMessage(chatId: string, messageId: string): Promise<proto.IWebMessageInfo | null> {
    const cacheKey = `${chatId}:${messageId}`;
    return this.messageCache.get(cacheKey) || null;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  async disconnect(): Promise<void> {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.ev.removeAllListeners('connection.update'); // Evita loops de reconexão
      this.socket.end(undefined);
      this.isConnected = false;
      this.logger.info(`Instância ${this.instanceId} desconectada`);
    }
  }

  // Callback methods for WhatsApp Manager
  onQRCode(callback: (qr: string) => void): void {
    this.qrCallback = callback;
  }

  onConnected(callback: (phone: string) => void): void {
    this.connectedCallback = callback;
  }

  onDisconnected(callback: () => void): void {
    this.disconnectedCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onHistorySync(callback: (history: { chats: any[] }) => void): void {
    this.historyCallback = callback;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
