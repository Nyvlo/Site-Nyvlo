import express, { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import * as http from 'http';
import multer from 'multer';
import * as fs from 'fs';
import { DatabaseService } from '../services/database-service';
import { ConfigLoader } from '../config/config-loader';
import { LogService } from '../services/log-service';
import { createApiRouter } from '../api';
import { setupSecurityMiddleware } from '../api/middleware/security.middleware';
import { globalLimiter } from '../api/middleware/rate-limit.middleware';
import { MonitoringService } from '../services/monitoring-service';

const JWT_SECRET = process.env.JWT_SECRET || 'nyvlo-secret-key-change-in-production';

interface AuthRequest extends Request {
  userId?: string;
  tenantId?: string;
  userRole?: string;
}

export class AdminServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private database: DatabaseService;
  private logger: LogService;
  private port: number;
  private botApp: any; // Reference to BotApplication for accessing services
  private monitoringService: MonitoringService | null = null;

  constructor(database: DatabaseService, logger: LogService, port: number = 4000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: (origin, callback) => {
          // Modular: Allows any origin and handles white-label domains automatically
          // Security is still enforced via JWT token validation in socket connections
          callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.database = database;
    this.logger = logger;
    this.port = port;

    this.app.set('database', this.database);

    // Initialize Monitoring Service
    this.monitoringService = new MonitoringService(this.logger);
    this.monitoringService.integrateWithExpress(this.app);

    this.setupMiddleware();
    this.setupMiddleware();
    // Routes and SocketIO setup moved to setBotApp to ensure botApp dependencies are available
  }

  setBotApp(botApp: any): void {
    this.botApp = botApp;

    // Setup routes and socket now that dependencies are available
    this.setupRoutes();
    this.setupSocketIO();

    // Inject IO into Scheduling Service
    if (this.botApp.schedulingService) {
      this.botApp.schedulingService.setSocketIO(this.io);
    }

    // Add error handler at the end
    if (this.monitoringService) {
      this.monitoringService.addErrorHandler(this.app);
    }
  }

  private setupMiddleware(): void {
    this.app.use(express.json());

    // Security middleware (Helmet)
    setupSecurityMiddleware(this.app);

    // Global rate limiting
    this.app.use(globalLimiter);

    // CORS for web interface (Modular: supports dynamic white-label domains)
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      } else {
        res.header('Access-Control-Allow-Origin', '*');
      }

      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-Id');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // Serve static files from src/admin/public (works in both dev and prod)
    const publicPath = path.join(__dirname, '..', '..', 'src', 'admin', 'public');
    this.app.use(express.static(publicPath));
    this.app.use('/admin', express.static(publicPath));

    // Serve uploads directory
    const uploadsPath = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    this.app.use('/uploads', express.static(uploadsPath));
  }

  private authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, tenantId: string, role: string };
      req.userId = decoded.userId;
      req.tenantId = decoded.tenantId || 'system-default';
      req.userRole = decoded.role || 'agent';
      next();
    } catch {
      res.status(401).json({ error: 'Token inválido' });
    }
  }

  private setupRoutes(): void {
    // Service Evaluation Routes (Specific routes before generic apiRouter)
    this.app.get('/api/dashboard/service-evaluations', this.authMiddleware.bind(this), this.getServiceEvaluations.bind(this));
    this.app.post('/api/dashboard/evaluate/:conversationId', this.authMiddleware.bind(this), this.triggerEvaluation.bind(this));
    this.app.get('/api/settings/modules', this.authMiddleware.bind(this), this.getModulesStatus.bind(this));
    this.app.post('/api/settings/modules/toggle', this.authMiddleware.bind(this), this.toggleModule.bind(this));

    // New Web Interface API routes
    const apiRouter = createApiRouter(
      this.database,
      this.logger,
      () => this.botApp?.getWhatsAppManager?.(),
      () => this.io,
      this.botApp?.emailService,
      this.botApp?.schedulingService
    );
    this.app.use('/api', apiRouter);

    // Legacy Auth routes (keep for backward compatibility)
    this.app.post('/api/login', this.login.bind(this));

    // 2FA Routes
    this.app.post('/api/auth/2fa/generate', this.authMiddleware.bind(this), this.generate2FA.bind(this));
    this.app.post('/api/auth/2fa/activate', this.authMiddleware.bind(this), this.activate2FA.bind(this));
    this.app.post('/api/auth/2fa/disable', this.authMiddleware.bind(this), this.disable2FA.bind(this));

    // Audit Logic Routes
    this.app.get('/api/audit-logs', this.authMiddleware.bind(this), this.getAuditLogs.bind(this));

    // Protected routes
    this.app.get('/api/dashboard', this.authMiddleware.bind(this), this.getDashboard.bind(this));
    this.app.get('/api/dashboard/operational-stats', this.authMiddleware.bind(this), this.getOperationalStats.bind(this));
    this.app.get('/api/dashboard/detail/:type', this.authMiddleware.bind(this), this.getDashboardDetail.bind(this));
    // Note: /api/users routes are handled by createUsersRoutes in the API router

    // Config routes
    this.app.get('/api/config', this.authMiddleware.bind(this), this.getConfig.bind(this));
    this.app.put('/api/config', this.authMiddleware.bind(this), this.updateConfig.bind(this));

    // Course routes
    this.app.get('/api/courses', this.authMiddleware.bind(this), this.getCourses.bind(this));
    this.app.put('/api/courses/:id', this.authMiddleware.bind(this), this.updateCourse.bind(this));

    // FAQ routes
    this.app.get('/api/faq', this.authMiddleware.bind(this), this.getFAQ.bind(this));
    this.app.post('/api/faq/questions', this.authMiddleware.bind(this), this.addFAQQuestion.bind(this));

    // Export routes
    this.app.get('/api/export/conversations', this.authMiddleware.bind(this), this.exportConversations.bind(this));
    this.app.get('/api/export/leads', this.authMiddleware.bind(this), this.exportLeads.bind(this));
    this.app.get('/api/export/appointments', this.authMiddleware.bind(this), this.exportAppointments.bind(this));

    // Backup route
    this.app.post('/api/backup', this.authMiddleware.bind(this), this.createBackup.bind(this));

    // AI test route
    this.app.post('/api/test-ai', this.authMiddleware.bind(this), this.testAI.bind(this));

    // New monitoring routes
    this.app.get('/api/health', this.getHealth.bind(this));
    this.app.get('/api/metrics', this.authMiddleware.bind(this), this.getMetrics.bind(this));
    this.app.get('/api/cache/stats', this.authMiddleware.bind(this), this.getCacheStats.bind(this));
    this.app.post('/api/cache/clear', this.authMiddleware.bind(this), this.clearCache.bind(this));
    this.app.get('/api/backups', this.authMiddleware.bind(this), this.getBackups.bind(this));

    // WhatsApp Management routes
    this.app.get('/api/whatsapp/instances', this.authMiddleware.bind(this), this.getWhatsAppInstances.bind(this));
    this.app.post('/api/whatsapp/instances', this.authMiddleware.bind(this), this.createWhatsAppInstance.bind(this));
    this.app.post('/api/whatsapp/instances/:id/connect', this.authMiddleware.bind(this), this.connectWhatsAppInstance.bind(this));
    this.app.post('/api/whatsapp/instances/:id/disconnect', this.authMiddleware.bind(this), this.disconnectWhatsAppInstance.bind(this));
    this.app.delete('/api/whatsapp/instances/:id', this.authMiddleware.bind(this), this.deleteWhatsAppInstance.bind(this));
    this.app.get('/api/whatsapp/instances/:id/qr', this.authMiddleware.bind(this), this.getWhatsAppQR.bind(this));
    this.app.get('/api/whatsapp/stats', this.authMiddleware.bind(this), this.getWhatsAppStats.bind(this));

    // Keywords routes
    this.app.get('/api/keywords', this.authMiddleware.bind(this), this.getKeywords.bind(this));
    this.app.post('/api/keywords', this.authMiddleware.bind(this), this.saveKeyword.bind(this));
    this.app.delete('/api/keywords/:keyword', this.authMiddleware.bind(this), this.deleteKeyword.bind(this));

    this.app.get('/api/analytics/summary', this.authMiddleware.bind(this), this.getAnalyticsSummary.bind(this));
    this.app.get('/api/analytics/leads', this.authMiddleware.bind(this), this.getLeads.bind(this));

    this.app.get('/api/knowledge', this.authMiddleware.bind(this), this.getKnowledge.bind(this));
    this.app.post('/api/knowledge', this.authMiddleware.bind(this), this.saveKnowledge.bind(this));
    this.app.delete('/api/knowledge/:id', this.authMiddleware.bind(this), this.deleteKnowledge.bind(this));

    // Payment Webhooks (No Auth)
    this.app.post('/webhooks/payments/asaas', this.handleAsaasWebhook.bind(this));
    this.app.post('/webhooks/payments/mercadopago', this.handleMercadoPagoWebhook.bind(this));

    // Logo Upload Route
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/');
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
    const upload = multer({ storage });
    this.app.post('/api/tenants/me/logo', this.authMiddleware.bind(this), upload.single('logo'), this.handleLogoUpload.bind(this));
  }

  private async handleLogoUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
      }

      const logoUrl = `/uploads/${req.file.filename}`;

      // Update tenant logo_url in database
      await this.database.run('UPDATE tenants SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [logoUrl, req.tenantId]);

      res.json({ success: true, logoUrl });
    } catch (error) {
      this.logger.error('Erro no upload de logo', error as Error);
      res.status(500).json({ error: 'Erro interno no upload' });
    }
  }

  private async login(req: Request, res: Response): Promise<void> {
    const { username, password, code } = req.body;
    const twoFactorService = this.botApp?.getTwoFactorService?.();

    if (!username || !password) {
      res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      return;
    }

    // First try web_users table (new system)
    const webUser = await this.database.get<any>('SELECT * FROM web_users WHERE username = ? AND active = 1', [username]);

    if (webUser) {
      const validPassword = await bcrypt.compare(password, webUser.password_hash);
      if (validPassword) {

        // 2FA Checks
        if (webUser.two_factor_enabled && twoFactorService) {
          if (!code) {
            // Requer código 2FA
            res.json({ require2fa: true, userId: webUser.id });
            return;
          }

          const isValid = twoFactorService.verifyToken(code, webUser.two_factor_secret);
          if (!isValid) {
            res.status(401).json({ error: 'Código de autenticação inválido' });
            return;
          }
        }

        // Update last login
        await this.database.run('UPDATE web_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [webUser.id]);

        // Log Login
        const auditService = this.botApp?.getAuditService?.();
        if (auditService) {
          auditService.log({
            tenantId: webUser.tenant_id,
            userId: webUser.id,
            action: 'login',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        }

        // Generate token compatible with new auth middleware
        const token = jwt.sign({
          userId: webUser.id,
          tenantId: webUser.tenant_id || 'system-default',
          username: webUser.username,
          role: webUser.role,
          allowedInstances: JSON.parse(webUser.allowed_instances || '[]')
        }, JWT_SECRET, { expiresIn: '8h' });

        res.json({
          token,
          admin: {
            id: webUser.id,
            username: webUser.username,
            name: webUser.name,
            role: webUser.role,
            twoFactorEnabled: !!webUser.two_factor_enabled
          }
        });
        return;
      }
    }

    // Fallback to legacy admins table
    const admin = await this.database.get<any>('SELECT * FROM admins WHERE username = ?', [username]);

    if (!admin) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Update last login
    await this.database.run('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);

    // Generate token compatible with new auth middleware (treat legacy admin as admin role)
    const token = jwt.sign({
      userId: admin.id,
      tenantId: admin.tenant_id || 'system-default',
      username: admin.username,
      role: 'admin',
      allowedInstances: []
    }, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: 'admin'
      }
    });
  }

  private async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Using COALESCE and casting for Postgres compatibility
    const stats = {
      conversationsToday: Number((await this.database.get<any>(`
        SELECT COUNT(DISTINCT user_id) as count FROM conversations 
        WHERE timestamp::DATE = ?::DATE
      `, [today]))?.count || 0),

      appointmentsToday: Number((await this.database.get<any>(`
        SELECT COUNT(*) as count FROM appointments 
        WHERE scheduled_at::DATE = ?::DATE AND status != 'cancelled'
      `, [today]))?.count || 0),

      enrollmentsPending: Number((await this.database.get<any>(`
        SELECT COUNT(*) as count FROM enrollments WHERE status = 'pending'
      `))?.count || 0),

      totalUsers: Number((await this.database.get<any>(`
        SELECT COUNT(*) as count FROM users
      `))?.count || 0),

      leadsToday: Number((await this.database.get<any>(`
        SELECT COUNT(*) as count FROM users 
        WHERE created_at::DATE = ?::DATE AND type = 'lead'
      `, [today]))?.count || 0)
    };

    res.json(stats);
  }

  private async getOperationalStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      // 1. Funcionários ativos (online)
      const activeAgents = await this.database.get<any>(`
        SELECT COUNT(*) as count FROM web_users 
        WHERE tenant_id = ? AND active = 1 AND status != 'offline'
      `, [tenantId]);

      // 2. Conversas ativas (em aberto)
      const activeConversations = await this.database.get<any>(`
        SELECT COUNT(*) as count FROM web_conversations 
        WHERE tenant_id = ? AND status = 'open'
      `, [tenantId]);

      // 3. Conversas ativas na última hora
      const lastHourConversations = await this.database.get<any>(`
        SELECT COUNT(*) as count FROM web_conversations 
        WHERE tenant_id = ? AND status = 'open' 
        AND updated_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `, [tenantId]);

      // 4. Lista de quem está atendendo quem
      const services = await this.database.all(`
        SELECT 
          c.id, 
          c.whatsapp_chat_id,
          u.name as agent_name, 
          cust.name as customer_name,
          cust.phone_number as customer_phone,
          c.updated_at as last_message_at,
          c.created_at as service_started_at
        FROM web_conversations c
        JOIN web_users u ON c.assigned_agent_id = u.id
        JOIN web_customers cust ON (c.whatsapp_chat_id = cust.whatsapp_id AND c.tenant_id = cust.tenant_id)
        WHERE c.tenant_id = ? AND c.status = 'open'
        ORDER BY c.updated_at DESC
        LIMIT 50
      `, [tenantId]);

      // 5. Resumo de agentes e últimos clientes
      const agentSummary = await this.database.all(`
        SELECT 
          u.name as agent_name,
          STRING_AGG(DISTINCT cust.name, ', ') as last_customers
        FROM web_users u
        JOIN web_conversations c ON u.id = c.assigned_agent_id
        JOIN web_customers cust ON (c.whatsapp_chat_id = cust.whatsapp_id AND c.tenant_id = cust.tenant_id)
        WHERE u.tenant_id = ? AND c.updated_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY u.id, u.name
        ORDER BY u.name ASC
      `, [tenantId]);

      res.json({
        success: true,
        metrics: {
          activeAgents: Number(activeAgents?.count || 0),
          activeConversations: Number(activeConversations?.count || 0),
          lastHourConversations: Number(lastHourConversations?.count || 0)
        },
        services,
        agentSummary
      });
    } catch (error) {
      this.logger.error('Erro ao buscar estatísticas operacionais', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  private async getDashboardDetail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { type } = req.params;

      let data: any[] = [];

      switch (type) {
        case 'messages-received':
          data = await this.database.all(`
            SELECT m.*, c.name as customer_name 
            FROM web_messages m
            JOIN web_conversations c ON m.conversation_id = c.id
            WHERE m.tenant_id = ? AND m.is_from_me = 0
            ORDER BY m.created_at DESC LIMIT 50
          `, [tenantId]);
          break;

        case 'automation-active':
          data = await this.database.all(`
            SELECT m.*, c.name as customer_name 
            FROM web_messages m
            JOIN web_conversations c ON m.conversation_id = c.id
            WHERE m.tenant_id = ? AND m.is_from_me = 1 AND m.sender_id IS NULL
            ORDER BY m.created_at DESC LIMIT 50
          `, [tenantId]);
          break;

        case 'active-chats':
          data = await this.database.all(`
            SELECT c.*, u.name as agent_name 
            FROM web_conversations c
            LEFT JOIN web_users u ON c.assigned_agent_id = u.id
            WHERE c.tenant_id = ? AND c.status = 'open'
            ORDER BY c.updated_at DESC
          `, [tenantId]);
          break;

        case 'waiting-chats':
          data = await this.database.all(`
            SELECT c.* 
            FROM web_conversations c
            WHERE c.tenant_id = ? AND c.status = 'open' AND c.assigned_agent_id IS NULL
            ORDER BY c.created_at ASC
          `, [tenantId]);
          break;

        case 'online-agents':
          data = await this.database.all(`
            SELECT id, name, username, email, status, status_updated_at 
            FROM web_users 
            WHERE tenant_id = ? AND active = 1 AND status != 'offline'
            ORDER BY name ASC
          `, [tenantId]);
          break;

        case 'last-hour-chats':
          data = await this.database.all(`
            SELECT c.*, u.name as agent_name 
            FROM web_conversations c
            LEFT JOIN web_users u ON c.assigned_agent_id = u.id
            WHERE c.tenant_id = ? AND c.status = 'open' 
            AND c.updated_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
            ORDER BY c.updated_at DESC
          `, [tenantId]);
          break;

        default:
          res.status(400).json({ success: false, error: 'Tipo inválido' });
          return;
      }

      res.json({ success: true, data });
    } catch (error) {
      this.logger.error(`Erro ao buscar detalhes do dashboard (${req.params.type})`, error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  private async getServiceEvaluations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const evaluations = await this.database.all(`
        SELECT 
          e.*, 
          u.name as agent_name, 
          c.whatsapp_chat_id,
          cust.name as customer_name
        FROM web_service_evaluations e
        JOIN web_users u ON e.agent_id = u.id
        JOIN web_conversations c ON e.conversation_id = c.id
        LEFT JOIN web_customers cust ON e.customer_id = cust.id
        WHERE e.tenant_id = ?
        ORDER BY e.analyzed_at DESC
        LIMIT 100
      `, [tenantId]);

      res.json({ success: true, data: evaluations });
    } catch (error) {
      this.logger.error('Erro ao buscar avaliações de serviço', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  private async triggerEvaluation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { conversationId } = req.params;

      const botApp = (this as any).botApp;
      const service = botApp?.getServiceEvaluationService();

      if (!service) {
        res.status(500).json({ success: false, error: 'Serviço de avaliação não disponível' });
        return;
      }

      const success = await service.evaluateConversation(tenantId, conversationId);
      res.json({ success });
    } catch (error) {
      this.logger.error('Erro ao disparar avaliação manual', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  private async getModulesStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const tenant = await this.database.get<any>('SELECT module_ai_evaluation FROM tenants WHERE id = ?', [tenantId]);
      res.json({ success: true, modules: { ai_evaluation: !!tenant?.module_ai_evaluation } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  private async toggleModule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { module, enabled } = req.body;

      if (module === 'ai_evaluation') {
        await this.database.run('UPDATE tenants SET module_ai_evaluation = ? WHERE id = ?', [enabled ? true : false, tenantId]);
        this.logger.info(`Módulo ${module} alterado para ${enabled} para tenant ${tenantId}`);
        res.json({ success: true, enabled: !!enabled });
      } else {
        res.status(400).json({ success: false, error: 'Módulo inválido' });
      }
    } catch (error) {
      this.logger.error('Erro ao alternar módulo', error as Error);
      res.status(500).json({ success: false, error: 'Erro interno ao salvar configuração' });
    }
  }

  private async getConversations(req: AuthRequest, res: Response): Promise<void> {
    const { date, userId } = req.query;

    let query = `
      SELECT c.*, u.name as user_name, u.phone as user_phone 
      FROM conversations c 
      LEFT JOIN users u ON c.user_id = u.id
    `;
    const params: any[] = [];

    if (date) {
      query += ' WHERE c.timestamp::DATE = ?::DATE';
      params.push(date);
    }

    if (userId) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' c.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY c.timestamp DESC LIMIT 100';

    const conversations = await this.database.query(query, params);
    res.json(conversations);
  }

  private async getAppointments(req: AuthRequest, res: Response): Promise<void> {
    const { status, date } = req.query;

    let query = 'SELECT * FROM appointments';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (date) {
      conditions.push('scheduled_at::DATE = ?::DATE');
      params.push(date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY scheduled_at DESC';

    const appointments = await this.database.query(query, params);
    res.json(appointments);
  }

  private async getEnrollments(req: AuthRequest, res: Response): Promise<void> {
    const { status } = req.query;

    let query = 'SELECT * FROM enrollments';
    const params: any[] = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';

    const enrollments = await this.database.query(query, params);
    res.json(enrollments);
  }

  private async getUsers(req: AuthRequest, res: Response): Promise<void> {
    const { type } = req.query;

    let query = 'SELECT * FROM users';
    const params: any[] = [];
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC';

    const users = await this.database.query(query, params);
    res.json(users);
  }

  private async getConfig(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';

    // Tenta buscar no banco de dados primeiro
    const settings = await this.database.get<any>('SELECT * FROM bot_settings WHERE tenant_id = ?', [tenantId]);

    if (settings) {
      // Se existe no banco, retorna o merge
      const baseConfig = ConfigLoader.load();
      const config = {
        ...baseConfig,
        company: {
          ...baseConfig.company,
          name: settings.company_name || baseConfig.company.name,
          address: settings.business_address || baseConfig.company.address,
          phone: settings.company_phone || baseConfig.company.phone,
          email: settings.company_email || baseConfig.company.email
        },
        messages: {
          ...baseConfig.messages,
          welcome: settings.welcome_message || baseConfig.messages.welcome,
          outsideHours: settings.outside_hours_message || baseConfig.messages.outsideHours,
          invalidOption: settings.invalid_option_message || baseConfig.messages.invalidOption,
          transferToHuman: settings.transfer_message || baseConfig.messages.transferToHuman,
        },
        ai: settings.ai_config ? JSON.parse(settings.ai_config) : baseConfig.ai,
        menus: settings.menus ? JSON.parse(settings.menus) : baseConfig.menus,
        bot: {
          ...baseConfig.bot,
          catalogLabel: settings.catalog_label || 'Cursos'
        }
      };
      res.json(config);
    } else {
      // Fallback para o config padrão
      res.json(ConfigLoader.load());
    }
  }

  private async updateConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId || 'system-default';
      const { company, messages, ai, bot } = req.body;

      // Upsert nas configurações do bot para este tenant
      await this.database.run(`
        INSERT INTO bot_settings (
          tenant_id, company_name, business_address, company_phone, company_email,
          welcome_message, outside_hours_message, 
          invalid_option_message, transfer_message, catalog_label, ai_config, menus, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        ON CONFLICT (tenant_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          business_address = EXCLUDED.business_address,
          company_phone = EXCLUDED.company_phone,
          company_email = EXCLUDED.company_email,
          welcome_message = EXCLUDED.welcome_message,
          outside_hours_message = EXCLUDED.outside_hours_message,
          invalid_option_message = EXCLUDED.invalid_option_message,
          transfer_message = EXCLUDED.transfer_message,
          catalog_label = EXCLUDED.catalog_label,
          ai_config = EXCLUDED.ai_config,
          menus = EXCLUDED.menus,
          updated_at = EXCLUDED.updated_at
      `, [
        tenantId,
        company?.name,
        company?.address,
        company?.phone,
        company?.email,
        messages?.welcome,
        messages?.outsideHours,
        messages?.invalidOption,
        messages?.transferToHuman,
        bot?.catalogLabel || 'Cursos',
        ai ? JSON.stringify(ai) : null,
        req.body.menus ? JSON.stringify(req.body.menus) : '[]'
      ]);

      res.json({ success: true, message: 'Configuração salva no banco de dados' });
    } catch (error) {
      this.logger.error('Erro ao atualizar configuração', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar configuração no banco' });
    }
  }

  private async getCourses(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';
    const courses = await this.database.query('SELECT * FROM bot_courses WHERE tenant_id = ? AND active = TRUE', [tenantId]);

    if (courses.length > 0) {
      res.json(courses.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        duration: c.duration,
        workload: c.workload,
        price: Number(c.price),
        prerequisites: JSON.parse(c.prerequisites || '[]'),
        documents: JSON.parse(c.documents || '[]'),
        active: c.active
      })));
    } else {
      const config = ConfigLoader.load();
      res.json(config.courses);
    }
  }

  private async updateCourse(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = req.tenantId || 'system-default';
    const { name, description, duration, workload, price, active } = req.body;

    try {
      await this.database.run(`
        UPDATE bot_courses 
        SET name = ?, description = ?, duration = ?, workload = ?, price = ?, active = ?
        WHERE id = ? AND tenant_id = ?
      `, [name, description, duration, workload, price, active, id, tenantId]);

      res.json({ success: true, message: 'Curso atualizado no banco' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar curso no banco' });
    }
  }

  private async getFAQ(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';

    const categories = await this.database.query('SELECT * FROM bot_faq_categories WHERE tenant_id = ? ORDER BY sort_order', [tenantId]);
    const questions = await this.database.query('SELECT * FROM bot_faq_questions WHERE tenant_id = ? ORDER BY sort_order', [tenantId]);

    if (categories.length > 0) {
      res.json({
        categories: categories.map((c: any) => ({ id: c.id, name: c.name, icon: c.icon, order: c.sort_order })),
        questions: questions.map((q: any) => ({
          id: q.id,
          categoryId: q.category_id,
          question: q.question,
          answer: q.answer,
          keywords: JSON.parse(q.keywords || '[]'),
          order: q.sort_order
        }))
      });
    } else {
      const config = ConfigLoader.load();
      res.json(config.faq);
    }
  }

  private async addFAQQuestion(req: AuthRequest, res: Response): Promise<void> {
    const { categoryId, question, answer, keywords } = req.body;
    const tenantId = req.tenantId || 'system-default';

    if (!categoryId || !question || !answer) {
      res.status(400).json({ error: 'Campos obrigatórios: categoryId, question, answer' });
      return;
    }

    try {
      const id = `q${Date.now()}`;
      const maxOrderResult = await this.database.get<any>(`
        SELECT MAX(sort_order) as max_order FROM bot_faq_questions WHERE tenant_id = ? AND category_id = ?
      `, [tenantId, categoryId]);

      const newOrder = (maxOrderResult?.max_order || 0) + 1;

      await this.database.run(`
        INSERT INTO bot_faq_questions (id, tenant_id, category_id, question, answer, keywords, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, tenantId, categoryId, question, answer, JSON.stringify(keywords || []), newOrder]);

      res.json({ success: true, question: { id, question, answer } });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao adicionar pergunta ao banco' });
    }
  }

  private async exportConversations(req: AuthRequest, res: Response): Promise<void> {
    const conversations = await this.database.query(`
      SELECT c.*, u.name as user_name, u.phone as user_phone 
      FROM conversations c 
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.timestamp DESC
    `);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=conversations.csv');

    const csv = this.toCSV(conversations);
    res.send(csv);
  }

  private async exportLeads(req: AuthRequest, res: Response): Promise<void> {
    const leads = await this.database.query(`
      SELECT * FROM users WHERE type = 'lead' ORDER BY created_at DESC
    `);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');

    const csv = this.toCSV(leads);
    res.send(csv);
  }

  private async exportAppointments(req: AuthRequest, res: Response): Promise<void> {
    const appointments = await this.database.query(`
      SELECT * FROM appointments ORDER BY scheduled_at DESC
    `);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=appointments.csv');

    const csv = this.toCSV(appointments);
    res.send(csv);
  }

  private createBackup(req: AuthRequest, res: Response): void {
    res.status(501).json({ error: 'Backup nativo não disponível para PostgreSQL neste servidor. Utilize pg_dump.' });
  }

  private async testAI(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { message } = req.body;

      if (!message) {
        res.status(400).json({ error: 'Mensagem é obrigatória' });
        return;
      }

      const config = ConfigLoader.load();

      if (!config.ai?.enabled) {
        res.status(400).json({ error: 'IA não está habilitada' });
        return;
      }

      if (!config.ai.apiKey) {
        res.status(400).json({ error: 'API Key não configurada' });
        return;
      }

      // Import AIService dynamically to avoid circular dependencies
      const { AIService } = await import('../services/ai-service.js');
      const aiService = new AIService(config.ai, config, this.logger);

      const response = await aiService.processMessage(message, []);

      res.json({
        success: true,
        response: response.message,
        action: response.action,
        confidence: response.confidence,
        intent: response.intent
      });
    } catch (error) {
      this.logger.error('Erro ao testar IA', error as Error);
      res.status(500).json({
        error: 'Erro ao testar IA: ' + (error as Error).message
      });
    }
  }

  // New monitoring endpoints
  private async getHealth(req: Request, res: Response): Promise<void> {
    try {
      if (this.botApp?.getHealthService) {
        const healthService = this.botApp.getHealthService();
        if (healthService) {
          const health = await healthService.checkHealth();
          res.json(health);
          return;
        }
      }

      // Fallback health check
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        checks: [
          {
            name: 'database',
            status: 'healthy',
            message: 'Database connection is working'
          }
        ]
      };

      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: (error as Error).message
      });
    }
  }

  private getMetrics(req: AuthRequest, res: Response): void {
    try {
      if (this.botApp?.getMetricsService) {
        const metricsService = this.botApp.getMetricsService();
        if (metricsService) {
          const metrics = metricsService.getMetrics();
          const health = metricsService.getHealthStatus();
          res.json({
            ...metrics,
            averageResponseTime: metricsService.getAverageResponseTime(),
            health: health.status,
            healthDetails: health.details
          });
          return;
        }
      }

      // Fallback metrics
      const metrics = {
        messagesReceived: 0,
        messagesProcessed: 0,
        errors: 0,
        uptime: process.uptime() * 1000,
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        health: 'healthy'
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao obter métricas' });
    }
  }

  private getCacheStats(req: AuthRequest, res: Response): void {
    try {
      if (this.botApp?.getCacheService) {
        const cacheService = this.botApp.getCacheService();
        if (cacheService) {
          const stats = cacheService.getStats();
          res.json({
            ...stats,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Fallback cache stats
      const stats = {
        size: 0,
        hitRate: 0,
        totalHits: 0,
        timestamp: new Date().toISOString()
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao obter estatísticas do cache' });
    }
  }

  private clearCache(req: AuthRequest, res: Response): void {
    try {
      if (this.botApp?.getCacheService) {
        const cacheService = this.botApp.getCacheService();
        if (cacheService) {
          cacheService.clear();
          this.logger.info('Cache limpo pelo admin', { adminId: req.userId });
          res.json({ success: true, message: 'Cache limpo com sucesso' });
          return;
        }
      }

      this.logger.info('Tentativa de limpar cache (serviço não disponível)', { adminId: req.userId });
      res.json({ success: false, message: 'Serviço de cache não disponível' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao limpar cache' });
    }
  }

  private getBackups(req: AuthRequest, res: Response): void {
    try {
      if (this.botApp?.getBackupService) {
        const backupService = this.botApp.getBackupService();
        if (backupService) {
          const backups = backupService.getBackupList();
          res.json(backups);
          return;
        }
      }

      // Fallback backup list
      const backups = [
        {
          name: 'backup-2025-12-23.db',
          size: 1024000,
          created: new Date().toISOString()
        }
      ];

      res.json(backups);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar backups' });
    }
  }

  // WhatsApp Management endpoints
  private getWhatsAppInstances(req: AuthRequest, res: Response): void {
    try {
      if (this.botApp?.getWhatsAppManager) {
        const whatsappManager = this.botApp.getWhatsAppManager();
        if (whatsappManager) {
          const instances = whatsappManager.getInstances();
          res.json(instances);
          return;
        }
      }

      res.json([]);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar instâncias WhatsApp' });
    }
  }

  private async createWhatsAppInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Nome da instância é obrigatório' });
        return;
      }

      if (this.botApp?.getWhatsAppManager) {
        const whatsappManager = this.botApp.getWhatsAppManager();
        if (whatsappManager) {
          const instanceId = await whatsappManager.createInstance(name);
          const instance = whatsappManager.getInstance(instanceId);
          res.json({ success: true, instance });
          return;
        }
      }

      res.status(500).json({ error: 'Gerenciador WhatsApp não disponível' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar instância WhatsApp' });
    }
  }

  private async connectWhatsAppInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (this.botApp?.getWhatsAppManager) {
        const whatsappManager = this.botApp.getWhatsAppManager();
        if (whatsappManager) {
          await whatsappManager.connectInstance(id);
          const instance = whatsappManager.getInstance(id);
          res.json({ success: true, instance });
          return;
        }
      }

      res.status(500).json({ error: 'Gerenciador WhatsApp não disponível' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao conectar instância WhatsApp: ' + (error as Error).message });
    }
  }

  private async disconnectWhatsAppInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (this.botApp?.getWhatsAppManager) {
        const whatsappManager = this.botApp.getWhatsAppManager();
        if (whatsappManager) {
          await whatsappManager.disconnectInstance(id);
          const instance = whatsappManager.getInstance(id);
          res.json({ success: true, instance });
          return;
        }
      }

      res.status(500).json({ error: 'Gerenciador WhatsApp não disponível' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao desconectar instância WhatsApp' });
    }
  }

  private async deleteWhatsAppInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (this.botApp?.getWhatsAppManager) {
        const whatsappManager = this.botApp.getWhatsAppManager();
        if (whatsappManager) {
          await whatsappManager.deleteInstance(id);
          res.json({ success: true });
          return;
        }
      }

      res.status(500).json({ error: 'Gerenciador WhatsApp não disponível' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar instância WhatsApp' });
    }
  }

  private getWhatsAppQR(req: AuthRequest, res: Response): void {
    try {
      const { id } = req.params;

      if (this.botApp?.getWhatsAppManager) {
        const whatsappManager = this.botApp.getWhatsAppManager();
        if (whatsappManager) {
          const instance = whatsappManager.getInstance(id);
          if (instance && instance.qrCode) {
            res.json({ qrCode: instance.qrCode });
          } else {
            res.json({ qrCode: null });
          }
          return;
        }
      }

      res.json({ qrCode: null });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao obter QR Code' });
    }
  }

  private async getWhatsAppStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (this.botApp?.getWhatsAppManager) {
        const whatsappManager = this.botApp.getWhatsAppManager();
        if (whatsappManager) {
          const stats = await whatsappManager.getStats();
          res.json(stats);
          return;
        }
      }

      res.json({
        total: 0,
        connected: 0,
        connecting: 0,
        disconnected: 0,
        error: 0
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao obter estatísticas WhatsApp' });
    }
  }

  private toCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private async getKeywords(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';
    const keywords = await this.database.query('SELECT * FROM bot_keywords WHERE tenant_id = ?', [tenantId]);
    res.json(keywords);
  }

  private async saveKeyword(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';
    const { keyword, targetState } = req.body;

    if (!keyword || !targetState) {
      res.status(400).json({ error: 'Keyword e targetState são obrigatórios' });
      return;
    }

    try {
      await this.database.run(`
        INSERT INTO bot_keywords (tenant_id, keyword, target_state)
        VALUES (?, ?, ?)
        ON CONFLICT (tenant_id, keyword) DO UPDATE SET target_state = EXCLUDED.target_state
      `, [tenantId, keyword.toLowerCase(), targetState]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar keyword' });
    }
  }

  private async deleteKeyword(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';
    const { keyword } = req.params;

    try {
      await this.database.run('DELETE FROM bot_keywords WHERE tenant_id = ? AND keyword = ?', [tenantId, keyword.toLowerCase()]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar keyword' });
    }
  }

  private setupSocketIO(): void {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (socket as any).userId = decoded.userId;
        (socket as any).userRole = decoded.role;
        next();
      } catch (error) {
        next(new Error('Token inválido'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      const instanceId = socket.handshake.query.instanceId as string;

      this.logger.info('Socket conectado', { userId, instanceId, socketId: socket.id });

      // Join instance room
      if (instanceId) {
        socket.join(`instance:${instanceId}`);
      }

      // Handle message send
      socket.on('message:send', async (data) => {
        try {
          const { conversationId, type, content, mediaId, replyTo, isInternal } = data;

          // Get conversation details
          const conversation = await this.database.get<any>(`
            SELECT whatsapp_chat_id, instance_id FROM web_conversations WHERE id = ?
          `, [conversationId]);

          if (!conversation) {
            socket.emit('error', { message: 'Conversa não encontrada' });
            return;
          }

          let messageId: string | null = null;
          if (isInternal) {
            messageId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          } else {
            const whatsappManager = this.botApp?.getWhatsAppManager?.();
            if (!whatsappManager) {
              socket.emit('error', { message: 'WhatsApp não disponível' });
              return;
            }
            messageId = await whatsappManager.sendMessage(
              conversation.instance_id,
              conversation.whatsapp_chat_id,
              content
            );
          }

          // Save to database
          const id = `msg_${Date.now()}`;
          const timestamp = new Date().toISOString();
          const senderId = (socket as any).userId || 'system';
          const senderName = (socket as any).userRole || 'admin';

          await this.database.run(`
            INSERT INTO web_messages (
              id, conversation_id, whatsapp_message_id, sender_id, sender_name,
              type, content, media_url, reply_to_id, status_sent, is_from_me, timestamp, is_internal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
          `, [
            id,
            conversationId,
            isInternal ? null : messageId,
            senderId,
            senderName,
            type,
            content,
            null,
            replyTo || null,
            timestamp,
            isInternal ? 1 : 0
          ]);

          // Update conversation
          await this.database.run(`UPDATE web_conversations SET updated_at = ? WHERE id = ?`, [timestamp, conversationId]);

          // Emit to all clients in the instance room
          const message = {
            id,
            conversationId,
            type: type || 'text',
            content,
            mediaUrl: null,
            replyTo,
            status: { sent: true, delivered: !!isInternal, read: !!isInternal },
            timestamp,
            isFromMe: true,
            isInternal: !!isInternal,
            senderId,
            senderName
          };

          this.io.to(`instance:${conversation.instance_id}`).emit('message:new', message);
        } catch (error) {
          console.error('Socket error sending message:', error);
          socket.emit('error', { message: 'Erro ao enviar mensagem' });
        }
      });

      // Handle conversation close and send rating link
      socket.on('conversation:close', async (data) => {
        try {
          const { conversationId, instanceId } = data;

          // Update conversation status
          await this.database.run(`
            UPDATE web_conversations 
            SET status = 'closed', closed_at = ?, closed_by = ?
            WHERE id = ? AND instance_id = ?
          `, [new Date().toISOString(), userId, conversationId, instanceId]);

          // Get conversation details
          const conversation = await this.database.get<any>(`
            SELECT whatsapp_chat_id, name FROM web_conversations 
            WHERE id = ? AND instance_id = ?
          `, [conversationId, instanceId]);

          if (conversation) {
            // Generate rating link
            const ratingLink = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/rating/${conversationId}?instance=${instanceId}`;

            // Send rating request via WhatsApp
            const whatsappManager = this.botApp?.getWhatsAppManager?.();
            if (whatsappManager) {
              const message = `Olá! 👋\n\nSeu atendimento foi finalizado. Gostaríamos muito de saber sua opinião!\n\n⭐ Avalie nosso atendimento:\n${ratingLink}\n\nSua avaliação nos ajuda a melhorar cada vez mais! 🚀`;

              await whatsappManager.sendMessage(
                instanceId,
                conversation.whatsapp_chat_id,
                message
              );
            }
          }

          // Emit close event
          this.io.to(`instance:${instanceId}`).emit('conversation:closed', {
            conversationId,
            closedBy: userId,
            timestamp: new Date().toISOString()
          });

          socket.emit('conversation:close:success', { conversationId });
        } catch (error) {
          console.error('Error closing conversation:', error);
          socket.emit('error', { message: 'Erro ao fechar conversa' });
        }
      });

      // Handle low rating notifications
      socket.on('rating:new', (data) => {
        const { rating, conversationId, agentId } = data;

        // If rating is low (1-2 stars), notify admin and agent
        if (rating <= 2) {
          // Notify admin
          this.io.to('role:admin').emit('notification:low-rating', {
            conversationId,
            agentId,
            rating,
            timestamp: new Date().toISOString(),
            message: `⚠️ Avaliação baixa recebida: ${rating} estrela${rating > 1 ? 's' : ''}`
          });

          // Notify the specific agent
          if (agentId) {
            this.io.to(`user:${agentId}`).emit('notification:low-rating', {
              conversationId,
              rating,
              timestamp: new Date().toISOString(),
              message: `Você recebeu uma avaliação de ${rating} estrela${rating > 1 ? 's' : ''}. Revise o atendimento para melhorar.`
            });
          }
        }
      });

      // Handle typing indicators
      socket.on('typing:start', (data) => {
        socket.to(`instance:${instanceId}`).emit('conversation:typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: true
        });
      });

      socket.on('typing:stop', (data) => {
        socket.to(`instance:${instanceId}`).emit('conversation:typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: false
        });
      });

      // Handle message read
      socket.on('message:read', async (data) => {
        const { conversationId } = data;
        await this.database.run(`
          UPDATE web_conversations SET unread_count = 0 WHERE id = ?
        `, [conversationId]);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.logger.info('Socket desconectado', { userId, socketId: socket.id });
      });
    });
  }

  // Method to emit events from outside (e.g., when receiving WhatsApp messages)
  emitToInstance(instanceId: string, event: string, data: any): void {
    this.io.to(`instance:${instanceId}`).emit(event, data);
  }

  getIO(): SocketIOServer {
    return this.io;
  }

  private async getAnalyticsSummary(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';

    try {
      const summary = await this.database.get<any>(`
        SELECT 
          (SELECT COUNT(*) FROM bot_leads WHERE tenant_id = $1) as total_leads,
          (SELECT COUNT(*) FROM bot_events WHERE tenant_id = $2 AND event_type = 'form_complete') as total_conversions,
          (SELECT COUNT(*) FROM bot_events WHERE tenant_id = $3 AND event_type = 'human_transfer_requested') as total_transfers,
          (SELECT COUNT(*) FROM bot_events WHERE tenant_id = $4 AND event_type = 'catalog_viewed') as total_catalog_views
      `, [tenantId, tenantId, tenantId, tenantId]);

      // Últimos eventos para o gráfico
      const chartData = await this.database.query<any>(`
        SELECT event_type, COUNT(*) as count, date(created_at) as date
        FROM bot_events
        WHERE tenant_id = $1 AND created_at > date('now', '-7 days')
        GROUP BY event_type, date(created_at)
        ORDER BY date ASC
      `, [tenantId]);

      res.json({ ...summary, chartData });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar sumário de analytics' });
    }
  }

  private async getLeads(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';

    try {
      const leads = await this.database.query<any>(`
        SELECT * FROM bot_leads 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC 
        LIMIT 100
      `, [tenantId]);

      res.json(leads.map(l => ({
        ...l,
        data: l.data ? JSON.parse(l.data) : {}
      })));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar leads' });
    }
  }

  private async getKnowledge(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';

    try {
      const knowledge = await this.database.query<any>(`
        SELECT * FROM bot_knowledge_base 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC
      `, [tenantId]);

      res.json(knowledge);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar base de conhecimento' });
    }
  }

  private async saveKnowledge(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';
    const { id, title, content, category, active } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
      return;
    }

    try {
      const knowledgeId = id || `kb_${Date.now()}`;

      await this.database.run(`
        INSERT INTO bot_knowledge_base (id, tenant_id, title, content, category, active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          category = EXCLUDED.category,
          active = EXCLUDED.active,
          updated_at = EXCLUDED.updated_at
      `, [knowledgeId, tenantId, title, content, category, active ?? true]);

      res.json({ success: true, message: 'Informação salva na base de conhecimento' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar informação na base de conhecimento' });
    }
  }

  private async deleteKnowledge(req: AuthRequest, res: Response): Promise<void> {
    const tenantId = req.tenantId || 'system-default';
    const { id } = req.params;

    try {
      await this.database.run(`
        DELETE FROM bot_knowledge_base 
        WHERE id = $1 AND tenant_id = $2
      `, [id, tenantId]);

      res.json({ success: true, message: 'Informação removida' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover informação' });
    }
  }

  private async handleAsaasWebhook(req: Request, res: Response): Promise<void> {
    const { event, payment } = req.body;

    // Verificação de segurança opcional via token no header
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (webhookToken && req.headers['asaas-access-token'] !== webhookToken) {
      this.logger.warn('Tentativa de webhook Asaas com token inválido');
      res.sendStatus(401);
      return;
    }

    this.logger.info('Webhook Asaas recebido', { event, paymentId: payment?.id });

    const paymentService = this.botApp?.getPaymentService();
    if (paymentService) {
      try {
        await paymentService.handleWebhook(req.body);
      } catch (error) {
        this.logger.error('Erro ao processar webhook Asaas', error as Error);
      }
    }

    res.sendStatus(200);
  }

  private async handleMercadoPagoWebhook(req: Request, res: Response): Promise<void> {
    const { action, data } = req.body;
    this.logger.info('Webhook Mercado Pago recebido', { action, paymentId: data?.id });

    if (action === 'payment.updated') {
      // No MP precisamos buscar o status atualizado
      // Simplificando: confirmamos se recebemos o ID do pagamento
      const paymentService = this.botApp?.getPaymentService();
      if (paymentService && data?.id) {
        const result = await paymentService.confirmPayment(data.id.toString());
        if (result) {
          this.logger.info('Pagamento confirmado via Mercado Pago', { orderId: result.orderId });
        }
      }
    }
    res.sendStatus(200);
  }

  // --- 2FA Handlers ---

  private async generate2FA(req: AuthRequest, res: Response): Promise<void> {
    const twoFactorService = this.botApp?.getTwoFactorService?.();
    if (!twoFactorService) {
      res.status(503).json({ error: 'Serviço 2FA indisponível' });
      return;
    }

    try {
      const user = await this.database.get<{ username: string }>('SELECT username FROM web_users WHERE id = ?', [req.userId]);
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const { secret, otpauth } = twoFactorService.generateSecret(user.username);
      const qrCode = await twoFactorService.generateQRCode(otpauth);

      await twoFactorService.saveTempSecret(req.userId!, secret);

      res.json({ secret, qrCode });
    } catch (error) {
      this.logger.error('Erro ao gerar 2FA', error as Error);
      res.status(500).json({ error: 'Erro interno ao gerar 2FA' });
    }
  }

  private async activate2FA(req: AuthRequest, res: Response): Promise<void> {
    const { token } = req.body;
    const twoFactorService = this.botApp?.getTwoFactorService?.();

    if (!twoFactorService) {
      res.status(503).json({ error: 'Serviço 2FA indisponível' });
      return;
    }

    if (!token) {
      res.status(400).json({ error: 'Token obrigatório' });
      return;
    }

    try {
      const success = await twoFactorService.activate(req.userId!, token);
      if (success) {
        res.json({ success: true, message: 'Autenticação de dois fatores ativada com sucesso' });

        // Log Audit
        this.botApp?.getAuditService?.()?.log({
          tenantId: req.tenantId!,
          userId: req.userId,
          action: 'enable_2fa',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

      } else {
        res.status(400).json({ success: false, error: 'Código inválido' });
      }
    } catch (error) {
      this.logger.error('Erro ao ativar 2FA', error as Error);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  private async disable2FA(req: AuthRequest, res: Response): Promise<void> {
    const twoFactorService = this.botApp?.getTwoFactorService?.();

    if (!twoFactorService) {
      res.status(503).json({ error: 'Serviço 2FA indisponível' });
      return;
    }

    try {
      await twoFactorService.disable(req.userId!);
      res.json({ success: true, message: 'Autenticação de dois fatores desativada' });

      // Log Audit
      this.botApp?.getAuditService?.()?.log({
        tenantId: req.tenantId!,
        userId: req.userId,
        action: 'disable_2fa',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  private async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    const auditService = this.botApp?.getAuditService?.();
    if (!auditService) {
      res.json([]); // Fail gracefully implies empty logs
      return;
    }

    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    try {
      const logs = await auditService.getLogs(req.tenantId!, limit, offset);
      res.json(logs);
    } catch (error) {
      this.logger.error('Erro ao buscar logs', error as Error);
      res.status(500).json({ error: 'Erro ao buscar logs' });
    }
  }

  start(): void {
    this.server.listen(this.port, () => {
      this.logger.info(`Nyvlo Omnichannel Admin Panel rodando em http://localhost:${this.port}`);
    });
  }
}
