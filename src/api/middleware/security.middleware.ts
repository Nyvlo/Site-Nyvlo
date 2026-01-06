import helmet from 'helmet';
import { Application } from 'express';

/**
 * Configura middlewares de segurança usando Helmet
 */
export function setupSecurityMiddleware(app: Application) {
    // Helmet com configurações otimizadas
    app.use(helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                connectSrc: ["'self'", "ws:", "wss:"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
            },
        },

        // Previne clickjacking
        frameguard: {
            action: 'deny'
        },

        // Remove o header X-Powered-By
        hidePoweredBy: true,

        // Força HTTPS (apenas em produção)
        hsts: process.env.NODE_ENV === 'production' ? {
            maxAge: 31536000, // 1 ano
            includeSubDomains: true,
            preload: true
        } : false,

        // Previne MIME type sniffing
        noSniff: true,

        // Habilita proteção XSS do navegador
        xssFilter: true,

        // Controla referrer
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin'
        },
    }));
}
