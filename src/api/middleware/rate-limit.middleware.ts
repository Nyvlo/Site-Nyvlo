import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Rate limiter global para todas as rotas
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // Limite de 1000 requisições por IP
    message: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter para rotas de autenticação (mais restritivo)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Apenas 10 tentativas de login
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
});

// Rate limiter para criação de contas
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Apenas 3 cadastros por hora por IP
    message: 'Limite de cadastros atingido. Tente novamente em 1 hora.',
});

// Rate limiter para envio de mensagens (por tenant)
export const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // 60 mensagens por minuto
    message: 'Limite de envio de mensagens atingido. Aguarde 1 minuto.',
    keyGenerator: (req: Request) => {
        // Usa o tenantId como chave ao invés do IP
        return (req as any).tenantId || req.socket?.remoteAddress || 'unknown';
    },
});

// Rate limiter para webhooks (previne spam)
export const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 webhooks por minuto
    message: 'Limite de webhooks atingido.',
});

// Rate limiter para API pública (se houver)
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // 30 requisições por minuto
    message: 'Limite de requisições da API atingido. Aguarde 1 minuto.',
    keyGenerator: (req: Request) => {
        // Usa a API key como identificador
        const apiKey = req.headers['x-api-key'] as string;
        return apiKey || req.socket?.remoteAddress || 'unknown';
    },
});
