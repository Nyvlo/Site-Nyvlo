import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nyvlo-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  tenantId?: string;
  username?: string;
  userRole?: string;
  allowedInstances?: string[];
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, error: 'Token não fornecido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      tenantId: string;
      username: string;
      role: string;
      allowedInstances?: string[];
    };

    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId || 'system-default';
    req.username = decoded.username;
    req.userRole = decoded.role;
    req.allowedInstances = decoded.allowedInstances;

    next();

  } catch (error) {
    res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
    res.status(403).json({ success: false, error: 'Acesso negado - apenas administradores' });
    return;
  }
  next();
}

export function superAdminOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'superadmin') {
    res.status(403).json({ success: false, error: 'Acesso negado - apenas superadministradores' });
    return;
  }
  next();
}

/**
 * Middleware to check if the tenant is active and not expired
 */
export async function tenantActiveMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const db = req.app.get('database');
  if (!db) {
    next();
    return;
  }

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      next();
      return;
    }

    const tenant = await db.get('SELECT status, expires_at FROM tenants WHERE id = ?', [tenantId]);

    if (!tenant) {
      res.status(403).json({ success: false, error: 'Tenant não encontrado' });
      return;
    }

    if (tenant.status !== 'active') {
      res.status(403).json({
        success: false,
        error: `Acesso bloqueado. Status da conta: ${tenant.status}`,
        code: 'TENANT_INACTIVE'
      });
      return;
    }

    if (tenant.expires_at) {
      const expiry = new Date(tenant.expires_at);
      const now = new Date();

      if (expiry < now) {
        // Check grace period (3 days)
        const graceLimit = new Date(expiry);
        graceLimit.setDate(graceLimit.getDate() + 3);

        if (now > graceLimit) {
          res.status(403).json({
            success: false,
            error: 'Sua assinatura expirou e o período de carência terminou. Realize o pagamento para continuar usando.',
            code: 'TENANT_EXPIRED'
          });
          return;
        }

        // Inside grace period - we allow access but we could technically 
        // add a header or something to alert the frontend
        res.setHeader('X-Tenant-Grace-Period', 'true');
      }
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Middleware for external API access using API Key
 */
export async function apiKeyMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key']?.toString();
  const db = req.app.get('database');

  if (!apiKey) {
    res.status(401).json({ success: false, error: 'X-API-Key não fornecida' });
    return;
  }

  if (!db) {
    res.status(500).json({ success: false, error: 'Erro interno - banco de dados indisponível' });
    return;
  }

  try {
    const tenant = await db.get('SELECT id, name, status, can_use_api, expires_at FROM tenants WHERE api_key = ?', [apiKey]);

    if (!tenant) {
      res.status(401).json({ success: false, error: 'API Key inválida' });
      return;
    }

    if (!tenant.can_use_api) {
      res.status(403).json({
        success: false,
        error: 'Seu plano não permite acesso via API. Faça o upgrade para os planos Pro ou Enterprise.',
        code: 'API_ACCESS_DENIED'
      });
      return;
    }

    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      res.status(403).json({ success: false, error: 'Conta suspensa ou inativa' });
      return;
    }

    // Populate request for subsequent handlers
    req.tenantId = tenant.id;
    req.userRole = 'api'; // Special role for API access

    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro interno ao validar API Key' });
  }
}
