import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database-service';
import { User, UserType } from '../types/database';

export class UserService {
  private database: DatabaseService;

  constructor(database: DatabaseService) {
    this.database = database;
  }

  async createOrUpdate(phone: string, name?: string, email?: string): Promise<User> {
    const existing = await this.getByPhone(phone);

    if (existing) {
      // Update existing user
      const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const values: any[] = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (email) {
        updates.push('email = ?');
        values.push(email);
      }

      values.push(phone);

      await this.database.run(`
        UPDATE users SET ${updates.join(', ')} WHERE phone = ?
      `, values);

      const updated = await this.getByPhone(phone);
      return updated!;
    }

    // Create new user
    const id = uuidv4();
    await this.database.run(`
      INSERT INTO users (id, phone, name, email, type) VALUES (?, ?, ?, ?, 'lead')
    `, [id, phone, name || null, email || null]);

    return {
      id,
      phone,
      name: name || null,
      email: email || null,
      type: 'lead',
      optOutBroadcast: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getByPhone(phone: string): Promise<User | null> {
    const row = await this.database.get<any>(`
      SELECT * FROM users WHERE phone = ?
    `, [phone]);

    if (!row) return null;

    return this.mapRowToUser(row);
  }

  async getById(id: string): Promise<User | null> {
    const row = await this.database.get<any>(`
      SELECT * FROM users WHERE id = ?
    `, [id]);

    if (!row) return null;

    return this.mapRowToUser(row);
  }

  async updateType(phone: string, type: UserType): Promise<boolean> {
    const result = await this.database.run(`
      UPDATE users SET type = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?
    `, [type, phone]);

    return result.changes > 0;
  }

  async updateOptOut(phone: string, optOut: boolean): Promise<boolean> {
    const result = await this.database.run(`
      UPDATE users SET opt_out_broadcast = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?
    `, [optOut ? 1 : 0, phone]);

    return result.changes > 0;
  }

  async getByType(type: UserType): Promise<User[]> {
    const rows = await this.database.query<any>(`
      SELECT * FROM users WHERE type = ?
    `, [type]);

    return rows.map(row => this.mapRowToUser(row));
  }

  async getBroadcastRecipients(audience: 'all' | 'students' | 'leads' | 'alumni'): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE opt_out_broadcast = 0';
    const params: any[] = [];

    if (audience !== 'all') {
      query += ' AND type = ?';
      params.push(audience === 'students' ? 'student' : audience === 'leads' ? 'lead' : 'alumni');
    }

    const rows = await this.database.query<any>(query, params);
    return rows.map(row => this.mapRowToUser(row));
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      phone: row.phone,
      name: row.name,
      email: row.email,
      type: row.type as UserType,
      optOutBroadcast: Boolean(row.opt_out_broadcast),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
