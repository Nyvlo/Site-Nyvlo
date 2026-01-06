import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from './database-service';
import { LogService } from './log-service';

const JWT_SECRET = process.env.JWT_SECRET || 'nyvlo-secret-key-change-in-production';
const JWT_EXPIRES_IN = '8h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'supervisor';
  tenantId: string;
  allowedInstances: string[];
  status?: string;
  statusMessage?: string;
  statusUpdatedAt?: string;
  industryType?: string;
  customLabels?: any;
  mustChangePassword?: boolean;
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  error?: string;
}

export class AuthService {
  private database: DatabaseService;
  private logger: LogService;

  constructor(database: DatabaseService, logger: LogService) {
    this.database = database;
    this.logger = logger;
  }

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Check web_users first
      let user = await this.database.get<any>(
        'SELECT * FROM web_users WHERE LOWER(username) = LOWER(?) AND active = 1',
        [username]
      );

      if (!user) {
        // Fallback to admins table
        user = await this.database.get<any>('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)', [username]);
        if (user) {
          user.role = 'admin';
          user.tenant_id = user.tenant_id || 'system-default'; // Default tenant for legacy admins
          user.allowed_instances = '[]';
        }
      }

      if (!user) {
        this.logger.warn('Login falhou - usuário não encontrado', { username });
        return { success: false, error: 'Credenciais inválidas' };
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        this.logger.warn('Login falhou - senha inválida', { username });
        return { success: false, error: 'Credenciais inválidas' };
      }

      // Update last login
      const table = user.role === 'admin' ? 'admins' : 'web_users';
      await this.database.run(`UPDATE ${table} SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      this.logger.info('Login bem-sucedido', { username, userId: user.id });

      // Fetch tenant configuration
      const tenant = await this.database.get<any>(
        'SELECT industry_type, custom_labels FROM tenants WHERE id = ?',
        [user.tenant_id || 'system-default']
      );
      if (tenant) {
        user.industry_type = tenant.industry_type;
        user.custom_labels = tenant.custom_labels;
      }

      return {
        success: true,
        token,
        refreshToken,
        user: this.formatUser(user)
      };
    } catch (error) {
      this.logger.error('Erro no login', error as Error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  generateToken(user: any): string {
    const allowedInstances = typeof user.allowed_instances === 'string'
      ? JSON.parse(user.allowed_instances || '[]')
      : user.allowedInstances || [];

    return jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id || 'system-default',
        username: user.username,
        role: user.role || 'agent',
        allowedInstances
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  generateRefreshToken(user: any): string {
    return jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

      if (decoded.type !== 'refresh') {
        return { success: false, error: 'Token inválido' };
      }

      let user = await this.database.get<any>('SELECT * FROM web_users WHERE id = ?', [decoded.userId]);

      if (!user) {
        user = await this.database.get<any>('SELECT * FROM admins WHERE id = ?', [decoded.userId]);
        if (user) user.role = 'admin';
      }

      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
        user: this.formatUser(user)
      };
    } catch {
      return { success: false, error: 'Token expirado ou inválido' };
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    let user = await this.database.get<any>(
      `SELECT id, username, email, name, role, allowed_instances, status, status_message 
       FROM web_users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      user = await this.database.get<any>('SELECT id, username, name FROM admins WHERE id = ?', [userId]);
      if (user) {
        user.role = 'admin';
        user.allowed_instances = '[]';
      }
    }

    if (user) {
      // Fetch tenant configuration
      const tenant = await this.database.get<any>(
        'SELECT industry_type, custom_labels FROM tenants WHERE id = ?',
        [user.tenant_id || 'system-default']
      );
      if (tenant) {
        user.industry_type = tenant.industry_type;
        user.custom_labels = tenant.custom_labels;
      }
    }

    return user ? this.formatUser(user) : null;
  }

  private formatUser(user: any): AuthUser {
    return {
      id: user.id,
      tenantId: user.tenant_id || 'system-default',
      username: user.username,
      email: user.email || '',
      name: user.name,
      role: user.role || 'agent',
      allowedInstances: JSON.parse(user.allowed_instances || '[]'),
      status: user.status || 'available',
      statusMessage: user.status_message || '',
      statusUpdatedAt: user.status_updated_at,
      industryType: user.industry_type || 'general',
      customLabels: typeof user.custom_labels === 'string' ? JSON.parse(user.custom_labels) : (user.custom_labels || {}),
      mustChangePassword: !!user.must_change_password
    };
  }
}
