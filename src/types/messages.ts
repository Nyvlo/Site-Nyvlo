export interface IncomingMessage {
  instanceId: string;
  tenantId: string;
  from: string;
  participant?: string;
  isFromMe?: boolean;
  text: string;
  timestamp: number;
  messageType: MessageType;
  mediaUrl?: string;
  quotedMessage?: string;
}

export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'sticker';

export interface MenuOption {
  id: string;
  title: string;
  description?: string;
}

export interface BotResponse {
  messages: string[];
  media?: MediaAttachment;
  nextState: string;
}

export interface MediaAttachment {
  type: 'image' | 'document' | 'audio';
  path: string;
  caption?: string;
}
