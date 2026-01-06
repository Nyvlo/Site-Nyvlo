import { Router, Request, Response } from 'express';
import { EmailService } from '../../services/email-service';
import { DatabaseService } from '../../services/database-service';
import { LogService } from '../../services/log-service';
import { AuthService } from '../../services/auth-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export function createAuthRoutes(database: DatabaseService, logger: LogService, emailService?: EmailService): Router {
  const router = Router();
  const authService = new AuthService(database, logger);

  // POST /api/auth/signup
  router.post('/signup', async (req: Request, res: Response) => {
    try {
      const { name, email, password, companyName } = req.body;

      if (!name || !email || !password || !companyName) {
        res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios' });
        return;
      }

      // Check if user already exists
      const existingUser = await database.get('SELECT id FROM web_users WHERE email = ?', [email]);
      if (existingUser) {
        res.status(400).json({ success: false, error: 'E-mail já cadastrado' });
        return;
      }

      const tenantId = `tnt_${uuidv4().substring(0, 8)}`;
      const userId = `usr_${uuidv4().substring(0, 8)}`;

      // 1. Transaction to Create Tenant, Admin User and Settings
      await database.transaction(async () => {
        // Create Tenant (Trial Plan)
        const trialPlan = await database.get<any>('SELECT * FROM plans WHERE id = ?', ['trial']);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days trial

        await database.run(`
          INSERT INTO tenants (id, name, status, plan_id, max_instances, max_agents, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          tenantId,
          companyName,
          'active',
          'trial',
          trialPlan?.max_instances || 1,
          trialPlan?.max_agents || 2,
          expiresAt.toISOString()
        ]);

        // Create Admin User
        const passwordHash = await bcrypt.hash(password, 10);
        await database.run(`
          INSERT INTO web_users (id, tenant_id, username, email, password_hash, name, role)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [userId, tenantId, email, email, passwordHash, name, 'admin']);

        // Create Default Bot Settings
        await database.run(`
          INSERT INTO bot_settings (tenant_id, company_name, welcome_message)
          VALUES (?, ?, ?)
        `, [tenantId, companyName, `Olá! Bem-vindo ao atendimento da ${companyName}. Como podemos ajudar?`]);
      });

      logger.info('Novo tenant cadastrado via signup', { tenantId, email });

      // Auto login after signup
      const loginResult = await authService.login(email, password);

      // Enviar e-mail de boas-vindas
      if (emailService) {
        emailService.sendWelcomeEmail(email, name).catch(err => logger.error('Erro ao enviar boas-vindas', err));
      }

      res.json({
        success: true,
        message: 'Conta criada com sucesso!',
        token: loginResult.token,
        user: loginResult.user
      });

    } catch (error) {
      logger.error('Erro no signup', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno ao criar conta' });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
      return;
    }

    const result = await authService.login(username, password);

    if (result.success) {
      res.json({
        success: true,
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } else {
      res.status(401).json({ success: false, error: result.error });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  });

  // POST /api/auth/refresh
  router.post('/refresh', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'Refresh token não fornecido' });
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    if (result.success) {
      res.json({
        success: true,
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } else {
      res.status(401).json({ success: false, error: result.error });
    }
  });

  // GET /api/auth/me
  router.get('/me', async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, error: 'Token não fornecido' });
      return;
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      res.status(401).json({ success: false, error: 'Token inválido' });
      return;
    }

    const user = await authService.getUserById(payload.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      return;
    }

    res.json({ success: true, user });
  });

  // POST /api/auth/change-password
  router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.userId;

      if (!newPassword) {
        res.status(400).json({ success: false, error: 'Nova senha é obrigatória' });
        return;
      }

      // 1. Find user in web_users or admins
      let user = await database.get<any>('SELECT id, password_hash, role FROM web_users WHERE id = ?', [userId]);
      let table = 'web_users';

      if (!user) {
        user = await database.get<any>('SELECT id, password_hash FROM admins WHERE id = ?', [userId]);
        table = 'admins';
      }

      if (!user) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }

      // 2. Verify old password if provided
      if (oldPassword) {
        const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
        if (!validPassword) {
          res.status(401).json({ success: false, error: 'Senha atual incorreta' });
          return;
        }
      }

      // 3. Update password
      const newHash = await bcrypt.hash(newPassword, 10);
      if (table === 'web_users') {
        await database.run(`UPDATE web_users SET password_hash = ?, must_change_password = 0 WHERE id = ?`, [newHash, userId]);
      } else {
        await database.run(`UPDATE admins SET password_hash = ? WHERE id = ?`, [newHash, userId]);
      }

      logger.info('Senha alterada pelo próprio usuário', { userId, table });
      res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error) {
      logger.error('Erro ao alterar senha', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  return router;
}
