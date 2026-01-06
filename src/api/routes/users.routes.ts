import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import multer from 'multer';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createUsersRoutes(
  database: DatabaseService,
  logger: LogService,
  getSocketIO: () => any
): Router {
  const router = Router();
  const upload = multer({ dest: 'uploads/' });

  // Apply auth middleware to all routes
  router.use(authMiddleware);

  // GET /api/users - List all users (admin only)
  router.get('/', async (req: AuthRequest, res: Response) => {
    try {
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      let targetTenantId = req.tenantId;
      if (req.userRole === 'superadmin' && req.query.tenantId) {
        targetTenantId = req.query.tenantId as string;
      }

      const users = await database.all(`
        SELECT id, username, email, name, role, allowed_instances, active, created_at, last_login, 
               status, status_message, status_updated_at, birth_date, cpf, must_change_password
        FROM web_users
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `, [targetTenantId]);

      res.json({
        success: true,
        users: users.map((u: any) => ({
          ...u,
          allowedInstances: JSON.parse(u.allowed_instances || '[]'),
          mustChangePassword: !!u.must_change_password
        }))
      });
    } catch (error) {
      logger.error('Erro ao listar usuários', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // GET /api/users/:id - Get user by ID
  router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.userId !== id) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const user = await database.get<any>(`
        SELECT id, username, email, name, role, allowed_instances, active, created_at, last_login,
               birth_date, cpf, must_change_password
        FROM web_users WHERE id = ? AND tenant_id = ?
      `, [id, req.tenantId]);

      if (!user) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }

      res.json({
        success: true,
        user: {
          ...user,
          allowedInstances: JSON.parse(user.allowed_instances || '[]'),
          mustChangePassword: !!user.must_change_password
        }
      });
    } catch (error) {
      logger.error('Erro ao buscar usuário', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // POST /api/users - Create new user (admin only)
  router.post('/', async (req: AuthRequest, res: Response) => {
    try {
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const { username, email, password, name, role, allowedInstances } = req.body;

      let targetTenantId = req.tenantId;
      if (req.userRole === 'superadmin' && req.body.tenantId) {
        targetTenantId = req.body.tenantId;
      }

      if (!username || !password || !name) {
        res.status(400).json({ success: false, error: 'Campos obrigatórios: username, password, name' });
        return;
      }

      const existing = await database.get('SELECT id FROM web_users WHERE username = ?', [username]);
      if (existing) {
        res.status(400).json({ success: false, error: 'Usuário já existe' });
        return;
      }

      const tenant = await database.get<any>('SELECT max_agents FROM tenants WHERE id = ?', [targetTenantId]);
      if (!tenant) {
        res.status(404).json({ success: false, error: 'Tenant destino não encontrado' });
        return;
      }

      const usersCount = await database.get<any>('SELECT COUNT(*) as count FROM web_users WHERE tenant_id = ?', [targetTenantId]);
      const maxAllowed = tenant?.max_agents || 2;

      if (usersCount.count >= maxAllowed) {
        res.status(403).json({ success: false, error: `Limite de agentes atingido (${maxAllowed}).` });
        return;
      }

      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const passwordHash = await bcrypt.hash(password, 10);
      const timestamp = new Date().toISOString();

      await database.run(`
        INSERT INTO web_users (id, tenant_id, username, email, password_hash, name, role, allowed_instances, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `, [id, targetTenantId, username, email || '', passwordHash, name, role || 'agent', JSON.stringify(allowedInstances || []), timestamp]);

      res.status(201).json({ success: true, user: { id, username, name, role: role || 'agent' } });
    } catch (error) {
      logger.error('Erro ao criar usuário', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // PUT /api/users/:id - Update user
  router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (req.userRole !== 'admin' && req.userRole !== 'superadmin' && req.userId !== id) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      const { email, password, name, role, allowedInstances, active } = req.body;

      const existing = await database.get('SELECT id FROM web_users WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (email !== undefined) { updates.push('email = ?'); params.push(email); }
      if (password) { updates.push('password_hash = ?'); params.push(await bcrypt.hash(password, 10)); }
      if (name) { updates.push('name = ?'); params.push(name); }

      if (req.userRole === 'admin' || req.userRole === 'superadmin') {
        if (role) { updates.push('role = ?'); params.push(role); }
        if (allowedInstances !== undefined) { updates.push('allowed_instances = ?'); params.push(JSON.stringify(allowedInstances)); }
        if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
      }

      if (updates.length > 0) {
        params.push(id);
        params.push(req.tenantId);
        await database.run(`UPDATE web_users SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao atualizar usuário', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // POST /api/users/import - Bulk import users
  router.post('/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: 'Arquivo não fornecido' });
        return;
      }

      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (data.length === 0) {
        res.status(400).json({ success: false, error: 'Arquivo vazio' });
        return;
      }

      const expectedColumns = ['Nome', 'data de nascimento', 'cpf', 'email', 'senha padrão'];
      const firstRow = data[0];
      const actualColumns = Object.keys(firstRow);

      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      if (missingColumns.length > 0) {
        res.status(400).json({
          success: false,
          error: `Colunas ausentes: ${missingColumns.join(', ')}. O padrão deve ser: ${expectedColumns.join(', ')}`
        });
        return;
      }

      const tenant = await database.get<any>('SELECT max_agents FROM tenants WHERE id = ?', [req.tenantId]);
      const currentCount = await database.get<any>('SELECT COUNT(*) as count FROM web_users WHERE tenant_id = ?', [req.tenantId]);
      const maxAllowed = tenant?.max_agents || 2;
      const availableSlots = maxAllowed - currentCount.count;

      if (data.length > availableSlots) {
        res.status(403).json({
          success: false,
          error: `Limite de agentes excedido. Você tem ${availableSlots} vagas disponíveis, mas tentou importar ${data.length}.`
        });
        return;
      }

      const results = { success: 0, errors: [] as string[] };

      for (const row of data) {
        try {
          const name = row['Nome'];
          const birthDate = row['data de nascimento'];
          const cpf = String(row['cpf']).replace(/\D/g, '');
          const email = row['email'];
          const defaultPassword = String(row['senha padrão']);

          if (!name || !email || !defaultPassword || !cpf) {
            results.errors.push(`Dados incompletos para: ${name || 'Sem nome'}`);
            continue;
          }

          const existing = await database.get('SELECT id FROM web_users WHERE email = ? OR cpf = ?', [email, cpf]);
          if (existing) {
            results.errors.push(`Usuário já existe (E-mail/CPF duplicado): ${email}`);
            continue;
          }

          const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const passwordHash = await bcrypt.hash(defaultPassword, 10);
          const timestamp = new Date().toISOString();

          await database.run(`
            INSERT INTO web_users (id, tenant_id, username, email, password_hash, name, role, birth_date, cpf, must_change_password, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'agent', ?, ?, 1, ?)
          `, [id, req.tenantId, email, email, passwordHash, name, birthDate, cpf, timestamp]);

          results.success++;
        } catch (err: any) {
          results.errors.push(`Erro ao processar ${row['email']}: ${err.message}`);
        }
      }

      res.json({ success: true, summary: results });
    } catch (error) {
      logger.error('Erro na importação de usuários', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno na importação' });
    }
  });

  // PUT /api/users/me/status
  router.put('/me/status', async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req;
      const { status, message } = req.body;
      if (!status) { res.status(400).json({ success: false, error: 'Status é obrigatório' }); return; }
      const timestamp = new Date().toISOString();

      await database.transaction(async () => {
        await database.run(`UPDATE web_agent_status_history SET end_at = ?, duration_seconds = EXTRACT(EPOCH FROM (CAST(? AS TIMESTAMP) - start_at))::INTEGER WHERE user_id = ? AND tenant_id = ? AND end_at IS NULL`, [timestamp, timestamp, userId, req.tenantId]);
        const historyId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await database.run(`INSERT INTO web_agent_status_history (id, tenant_id, user_id, status, reason, start_at) VALUES (?, ?, ?, ?, ?, ?)`, [historyId, req.tenantId, userId, status, message || null, timestamp]);
        await database.run(`UPDATE web_users SET status = ?, status_message = ?, status_updated_at = ? WHERE id = ? AND tenant_id = ?`, [status, message || null, timestamp, userId, req.tenantId]);
      });

      const io = getSocketIO();
      if (io) io.emit('user:status', { userId, status, message, timestamp });
      res.json({ success: true, status, message, timestamp });
    } catch (error) {
      logger.error('Erro ao atualizar status', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // DELETE /api/users/:id - Delete user (admin only)
  router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
      if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }
      const { id } = req.params;
      if (req.userId === id) {
        res.status(400).json({ success: false, error: 'Não é possível deletar seu próprio usuário' });
        return;
      }
      await database.run('DELETE FROM web_users WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao deletar usuário', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  return router;
}
