import * as bcrypt from 'bcryptjs';
import { DatabaseService } from './database-service';
import { LogService } from './log-service';

export interface WebUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'supervisor';
  allowedInstances: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface CreateUserInput {
  username: string;
  email?: string;
  password: string;
  name: string;
  role?: 'admin' | 'agent' | 'supervisor';
  allowedInstances?: string[];
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: 'admin' | 'agent' | 'supervisor';
  allowedInstances?: string[];
  active?: boolean;
  password?: string;
}

export class WebUserService {
  private database: DatabaseService;
  private logger: LogService;

  constructor(database: DatabaseService, logger: LogService) {
    this.database = database;
    this.logger = logger;
  }

  async createUser(input: CreateUserInput): Promise<WebUser> {
    // Check if username exists
    const existing = await this.database.get('SELECT id FROM web_users WHERE username = ?', [input.username]);
    if (existing) {
      throw new Error('Nome de usuário já existe');
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const passwordHash = await bcrypt.hash(input.password, 10);
    const timestamp = new Date().toISOString();

    await this.database.run(`
      INSERT INTO web_users (
        id, username, email, password_hash, name, role, 
        allowed_instances, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      id,
      input.username,
      input.email || '',
      passwordHash,
      input.name,
      input.role || 'agent',
      JSON.stringify(input.allowedInstances || []),
      timestamp,
      timestamp
    ]);

    this.logger.info('Usuário criado', { userId: id, username: input.username });
    const user = await this.getUserById(id);
    if (!user) throw new Error('Erro ao criar usuário');
    return user;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<WebUser | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.email !== undefined) {
      updates.push('email = ?');
      values.push(input.email);
    }
    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.role !== undefined) {
      updates.push('role = ?');
      values.push(input.role);
    }
    if (input.allowedInstances !== undefined) {
      updates.push('allowed_instances = ?');
      values.push(JSON.stringify(input.allowedInstances));
    }
    if (input.active !== undefined) {
      updates.push('active = ?');
      values.push(input.active ? 1 : 0);
    }
    if (input.password) {
      updates.push('password_hash = ?');
      values.push(await bcrypt.hash(input.password, 10));
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      await this.database.run(`UPDATE web_users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    this.logger.info('Usuário atualizado', { userId: id });
    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.database.run('DELETE FROM web_users WHERE id = ?', [id]);

    if (result.changes > 0) {
      this.logger.info('Usuário deletado', { userId: id });
      return true;
    }
    return false;
  }

  async getUserById(id: string): Promise<WebUser | null> {
    const user = await this.database.get<any>(`
      SELECT * FROM web_users WHERE id = ?
    `, [id]);

    return user ? this.formatUser(user) : null;
  }

  async getUserByUsername(username: string): Promise<WebUser | null> {
    const user = await this.database.get<any>(`
      SELECT * FROM web_users WHERE username = ?
    `, [username]);

    return user ? this.formatUser(user) : null;
  }

  async listUsers(filters?: { role?: string; active?: boolean }): Promise<WebUser[]> {
    let query = 'SELECT * FROM web_users';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.role) {
      conditions.push('role = ?');
      params.push(filters.role);
    }
    if (filters?.active !== undefined) {
      conditions.push('active = ?');
      params.push(filters.active ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const users = await this.database.query<any>(query, params);
    return users.map(u => this.formatUser(u));
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.database.get<any>('SELECT password_hash FROM web_users WHERE id = ?', [id]);

    if (!user) return false;

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return false;

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.database.run('UPDATE web_users SET password_hash = ?, updated_at = ? WHERE id = ?', [
      newHash,
      new Date().toISOString(),
      id
    ]);

    this.logger.info('Senha alterada', { userId: id });
    return true;
  }

  hasPermission(user: WebUser, instanceId: string): boolean {
    if (user.role === 'admin') return true;
    return user.allowedInstances.includes(instanceId) || user.allowedInstances.includes('*');
  }

  private formatUser(user: any): WebUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email || '',
      name: user.name,
      role: user.role || 'agent',
      allowedInstances: JSON.parse(user.allowed_instances || '[]'),
      active: user.active === 1,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login
    };
  }
}
