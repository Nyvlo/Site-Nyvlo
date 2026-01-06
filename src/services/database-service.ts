import { Pool, PoolClient } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
import { LogService } from './log-service';

export class DatabaseService {
  private pgPool: Pool | null = null;
  private logger: LogService;
  private type: 'postgres' = 'postgres';
  private transactionStorage = new AsyncLocalStorage<PoolClient>();

  constructor(logger: LogService) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    await this.initializePostgres();
    await this.createTables();
    await this.ensureDefaultTenant();
    this.logger.info('Banco de dados inicializado (PostgreSQL Nativo)', { type: this.type });
  }

  private async ensureDefaultTenant(): Promise<void> {
    const defaultTenantId = 'system-default';
    const existing = await this.get('SELECT id FROM tenants WHERE id = ?', [defaultTenantId]);

    if (!existing) {
      // Inserir Planos Iniciais
      await this.run(`
        INSERT INTO plans (id, name, description, price_monthly, max_instances, max_agents, ai_enabled, can_use_api)
        VALUES 
          ('trial', 'Período de Teste', 'Teste grátis de 7 dias com recursos básicos', 0, 1, 2, false, false),
          ('starter', 'Plano Starter', 'Ideal para pequenos negócios', 97.00, 1, 3, false, false),
          ('pro', 'Plano Pro', 'Para empresas em crescimento', 197.00, 3, 10, true, true),
          ('enterprise', 'Plano Enterprise', 'Recursos ilimitados e suporte prioritário', 497.00, 10, 50, true, true)
        ON CONFLICT (id) DO NOTHING;
      `);

      await this.run(
        'INSERT INTO tenants (id, name, status, plan_id, max_instances, max_agents) VALUES (?, ?, ?, ?, ?, ?)',
        [defaultTenantId, 'Nyvlo Omnichannel Business', 'active', 'pro', 3, 10]
      );
      this.logger.info('Tenant padrão criado: system-default');
    }
  }


  private async initializePostgres(): Promise<void> {
    const connectionString = process.env.POSTGRES_URL || 'postgresql://nyvlo:nyvlo@localhost:5433/nyvlo';
    this.pgPool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    try {
      const client = await this.pgPool.connect();
      client.release();
    } catch (err) {
      this.logger.error('Erro ao conectar ao PostgreSQL', err as Error);
      throw err;
    }
  }

  private async createTables(): Promise<void> {
    const sql = `
      -- Tabela de Planos
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10, 2) DEFAULT 0,
        max_instances INTEGER DEFAULT 1,
        max_agents INTEGER DEFAULT 2,
        ai_enabled BOOLEAN DEFAULT FALSE,
        can_use_api BOOLEAN DEFAULT FALSE,
        addon_ai_evaluation_price DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de Add-ons Ativos por Tenant
      CREATE TABLE IF NOT EXISTS tenant_addons (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        addon_type TEXT NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        price_override DECIMAL(10, 2),
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activated_by TEXT,
        UNIQUE(tenant_id, addon_type)
      );

      -- Tabela de Tenants (Clientes SaaS)
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active', -- active, trial, suspended, expired
        plan_id TEXT,
        max_instances INTEGER DEFAULT 1,
        max_agents INTEGER DEFAULT 2,
        use_bridge_mode BOOLEAN DEFAULT FALSE,
        industry_type TEXT DEFAULT 'general',
        custom_labels TEXT DEFAULT '{}',
        logo_url TEXT,
        primary_color TEXT DEFAULT '#10b981',
        secondary_color TEXT DEFAULT '#059669',
        ai_enabled BOOLEAN DEFAULT FALSE,
        can_use_api BOOLEAN DEFAULT FALSE,
        asaas_customer_id TEXT,
        pagarme_customer_id TEXT,
        pagarme_subscription_id TEXT,
        api_key TEXT UNIQUE,
        module_ai_evaluation BOOLEAN DEFAULT FALSE,
        custom_domain TEXT UNIQUE,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabelas principais do Bot
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        phone TEXT NOT NULL,
        name TEXT,
        email TEXT,
        type TEXT DEFAULT 'lead',
        opt_out_broadcast INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, phone)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        state TEXT NOT NULL,
        data TEXT DEFAULT '{}',
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        code TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        scheduled_at TIMESTAMP NOT NULL,
        purpose TEXT,
        status TEXT DEFAULT 'pending',
        reminder_sent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        protocol TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        full_name TEXT NOT NULL,
        cpf TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        course_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        direction TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        message TEXT NOT NULL,
        audience TEXT NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'pending',
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        tenant_id TEXT REFERENCES tenants(id), -- Null for superadmins
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );

      -- Tabelas de Configuração do Bot Dinâmico (SaaS)
      CREATE TABLE IF NOT EXISTS bot_settings (
        tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
        company_name TEXT,
        business_address TEXT,
        company_phone TEXT,
        company_email TEXT,
        catalog_label TEXT DEFAULT 'Cursos',
        welcome_message TEXT,
        goodbye_message TEXT,
        invalid_option_message TEXT,
        outside_hours_message TEXT,
        transfer_message TEXT,
        no_agent_message TEXT,
        business_hours TEXT DEFAULT '{}',
        session_timeout INTEGER DEFAULT 30,
        ai_config TEXT DEFAULT '{}',
        webhook_url TEXT,
        webhook_events TEXT DEFAULT '[]',
        payment_provider TEXT, -- 'asaas', 'mercadopago', 'none'
        payment_config TEXT DEFAULT '{}', -- JSON with credentials
        menus TEXT DEFAULT '[]', -- JSON with menu structure
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bot_courses (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        description TEXT,
        duration TEXT,
        workload TEXT,
        price DECIMAL(10, 2),
        prerequisites TEXT DEFAULT '[]',
        documents TEXT DEFAULT '[]',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bot_faq_categories (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        icon TEXT,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS bot_faq_questions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        category_id TEXT NOT NULL REFERENCES bot_faq_categories(id),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        keywords TEXT DEFAULT '[]',
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS bot_keywords (
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        keyword TEXT NOT NULL,
        target_state TEXT NOT NULL,
        PRIMARY KEY (tenant_id, keyword)
      );

      CREATE TABLE IF NOT EXISTS bot_forms (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bot_form_steps (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL REFERENCES bot_forms(id),
        question TEXT NOT NULL,
        field_name TEXT NOT NULL,
        validation_type TEXT DEFAULT 'text',
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS bot_leads (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        email TEXT,
        status TEXT DEFAULT 'new',
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS bot_events (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL, -- 'lead_captured', 'form_start', 'form_complete', 'conversion', 'human_transfer'
        event_path TEXT, -- ex: 'form_contato', 'item_comprado'
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bot_knowledge_base (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT, -- ex: 'procedimentos', 'preços', 'regras'
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bot_orders (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL,
        item_id TEXT, -- ID do curso ou produto
        amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'cancelled'
        payment_method TEXT DEFAULT 'pix',
        pix_copy_paste TEXT,
        pix_qr_code TEXT, -- base64 ou URL
        external_id TEXT UNIQUE, -- ID no gateway de pagamento
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabelas da Interface Web (Recuperadas)
      CREATE TABLE IF NOT EXISTS web_users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'agent',
        allowed_instances TEXT DEFAULT '[]',
        settings TEXT DEFAULT '{}',
        active INTEGER DEFAULT 1,
        status TEXT DEFAULT 'available',
        status_message TEXT,
        status_updated_at TIMESTAMP,
        last_login TIMESTAMP,
        birth_date DATE,
        cpf TEXT,
        must_change_password INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS web_conversations (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        instance_id TEXT NOT NULL,
        whatsapp_chat_id TEXT NOT NULL,
        type TEXT DEFAULT 'individual',
        name TEXT,
        profile_picture TEXT,
        is_archived INTEGER DEFAULT 0,
        is_pinned INTEGER DEFAULT 0,
        unread_count INTEGER DEFAULT 0,
        assigned_agent_id TEXT REFERENCES web_users(id),
        status TEXT DEFAULT 'open',
        closed_at TIMESTAMP,
        closed_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, instance_id, whatsapp_chat_id)
      );

      CREATE TABLE IF NOT EXISTS web_messages (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        conversation_id TEXT NOT NULL REFERENCES web_conversations(id),
        whatsapp_message_id TEXT,
        sender_id TEXT,
        sender_name TEXT,
        type TEXT DEFAULT 'text',
        content TEXT,
        media_url TEXT,
        media_metadata TEXT,
        reply_to_id TEXT,
        status_sent INTEGER DEFAULT 0,
        status_delivered INTEGER DEFAULT 0,
        status_read INTEGER DEFAULT 0,
        is_from_me INTEGER DEFAULT 0,
        is_starred INTEGER DEFAULT 0,
        is_internal INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS web_instances (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'disconnected',
        ai_enabled INTEGER DEFAULT 1,
        ai_provider TEXT DEFAULT 'groq',
        ai_model TEXT DEFAULT 'llama-3.1-70b-versatile',
        ai_max_messages INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS web_conversation_ratings (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        conversation_id TEXT NOT NULL REFERENCES web_conversations(id),
        instance_id TEXT NOT NULL,
        agent_id TEXT,
        rating INTEGER NOT NULL,
        comment TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS web_customers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        whatsapp_id TEXT,
        name TEXT,
        phone_number TEXT,
        email TEXT,
        document TEXT,
        customer_type TEXT DEFAULT 'personal', -- 'personal' ou 'company'
        last_interaction TIMESTAMP,
        total_messages INTEGER DEFAULT 0,
        ai_messages_count INTEGER DEFAULT 0,
        agent_messages_count INTEGER DEFAULT 0,
        avg_rating DECIMAL(3,2) DEFAULT 0,
        ratings_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, whatsapp_id)
      );

      CREATE TABLE IF NOT EXISTS web_group_participants (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        group_id TEXT NOT NULL,
        whatsapp_id TEXT NOT NULL,
        name TEXT,
        phone_number TEXT,
        is_admin INTEGER DEFAULT 0,
        is_super_admin INTEGER DEFAULT 0,
        joined_at TIMESTAMP,
        UNIQUE(tenant_id, group_id, whatsapp_id)
      );

      CREATE TABLE IF NOT EXISTS web_quick_messages (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        shortcut TEXT,
        variables TEXT DEFAULT '[]',
        category TEXT,
        created_by TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS web_labels (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS web_conversation_labels (
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        conversation_id TEXT NOT NULL REFERENCES web_conversations(id),
        label_id TEXT NOT NULL REFERENCES web_labels(id),
        PRIMARY KEY (tenant_id, conversation_id, label_id)
      );

      CREATE TABLE IF NOT EXISTS web_contact_custom_fields (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        contact_id TEXT NOT NULL REFERENCES web_contacts(id),
        field_key TEXT NOT NULL,
        field_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS web_agent_status_history (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL REFERENCES web_users(id),
        status TEXT NOT NULL,
        reason TEXT,
        start_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_at TIMESTAMP,
        duration_seconds INTEGER
      );

      CREATE TABLE IF NOT EXISTS web_notifications (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info', -- info, warning, error, success
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS web_service_evaluations (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        agent_id TEXT NOT NULL REFERENCES web_users(id),
        conversation_id TEXT NOT NULL REFERENCES web_conversations(id),
        customer_id TEXT,
        score_cordiality INTEGER DEFAULT 0,
        score_overall INTEGER DEFAULT 0,
        customer_rating INTEGER DEFAULT 0,
        feedback TEXT,
        improvement_points TEXT,
        comparison_with_customer TEXT,
        analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.exec(sql);

    // Create audit_logs table before indexes
    await this.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT REFERENCES web_users(id),
        action TEXT NOT NULL,
        entity TEXT,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_web_messages_conv ON web_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_web_conversations_chat ON web_conversations(whatsapp_chat_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)'
    ];

    for (const idx of indexes) {
      await this.exec(idx);
    }

    // Migrações e Ajustes de Schema (PostgreSQL)
    await this.exec(`
      DO $$
      BEGIN
        -- Colunas para 2FA em web_users
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_users' AND column_name='two_factor_secret') THEN
          ALTER TABLE web_users ADD COLUMN two_factor_secret TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_users' AND column_name='two_factor_enabled') THEN
           ALTER TABLE web_users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_users' AND column_name='two_factor_verified') THEN
           ALTER TABLE web_users ADD COLUMN two_factor_verified BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='custom_domain') THEN
           ALTER TABLE tenants ADD COLUMN custom_domain TEXT UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='api_key') THEN
           ALTER TABLE tenants ADD COLUMN api_key TEXT UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='can_use_api') THEN
           ALTER TABLE tenants ADD COLUMN can_use_api BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='asaas_customer_id') THEN
           ALTER TABLE tenants ADD COLUMN asaas_customer_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='pagarme_customer_id') THEN
           ALTER TABLE tenants ADD COLUMN pagarme_customer_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='pagarme_subscription_id') THEN
           ALTER TABLE tenants ADD COLUMN pagarme_subscription_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='ai_enabled') THEN
           ALTER TABLE tenants ADD COLUMN ai_enabled BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='module_ai_evaluation') THEN
           ALTER TABLE tenants ADD COLUMN module_ai_evaluation BOOLEAN DEFAULT FALSE;
        END IF;

        -- Add-on pricing for plans
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='addon_ai_evaluation_price') THEN
           ALTER TABLE plans ADD COLUMN addon_ai_evaluation_price DECIMAL(10, 2) DEFAULT 0;
        END IF;

        -- Colunas para Importação em Lote
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_users' AND column_name='birth_date') THEN
          ALTER TABLE web_users ADD COLUMN birth_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_users' AND column_name='cpf') THEN
          ALTER TABLE web_users ADD COLUMN cpf TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_users' AND column_name='must_change_password') THEN
          ALTER TABLE web_users ADD COLUMN must_change_password INTEGER DEFAULT 0;
        END IF;

        -- Tabela de Auditoria
        -- Tabela de Auditoria (Moved to before indexes)
        
        -- Tabela de Clientes (Base unificada)
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'web_customers') THEN
            CREATE TABLE web_customers (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                whatsapp_id TEXT,
                name TEXT,
                phone_number TEXT,
                email TEXT,
                document TEXT,
                customer_type TEXT DEFAULT 'personal',
                last_interaction TIMESTAMP,
                total_messages INTEGER DEFAULT 0,
                ai_messages_count INTEGER DEFAULT 0,
                agent_messages_count INTEGER DEFAULT 0,
                avg_rating DECIMAL(3,2) DEFAULT 0,
                ratings_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, whatsapp_id)
            );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_customers' AND column_name='document') THEN
          ALTER TABLE web_customers ADD COLUMN document TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_customers' AND column_name='customer_type') THEN
          ALTER TABLE web_customers ADD COLUMN customer_type TEXT DEFAULT 'personal';
        END IF;
        -- Make whatsapp_id nullable if it was NOT NULL
        ALTER TABLE web_customers ALTER COLUMN whatsapp_id DROP NOT NULL;

        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'web_conversation_ratings') THEN
            CREATE TABLE web_conversation_ratings (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL REFERENCES tenants(id),
                conversation_id TEXT NOT NULL,
                instance_id TEXT NOT NULL,
                agent_id TEXT,
                rating INTEGER NOT NULL,
                comment TEXT,
                customer_name TEXT,
                customer_phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_customers' AND column_name='ai_messages_count') THEN
          ALTER TABLE web_customers ADD COLUMN ai_messages_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_customers' AND column_name='agent_messages_count') THEN
          ALTER TABLE web_customers ADD COLUMN agent_messages_count INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='web_customers' AND column_name='agent_messages_count') THEN
          ALTER TABLE web_customers ADD COLUMN agent_messages_count INTEGER DEFAULT 0;
        END IF;

        -- Appointments improvements
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='end_at') THEN
           ALTER TABLE appointments ADD COLUMN end_at TIMESTAMP;
        END IF;

      END $$;
    `);
  }

  private prepareSql(sql: string): string {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  getType(): 'postgres' {
    return 'postgres';
  }

  private async getClient(): Promise<PoolClient | Pool> {
    const client = this.transactionStorage.getStore();
    return client || this.pgPool!;
  }

  async exec(sql: string): Promise<void> {
    const client = await this.getClient();
    await client.query(this.prepareSql(sql));
  }

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const client = await this.getClient();
    const res = await client.query(this.prepareSql(sql), params);
    return res.rows;
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return this.query<T>(sql, params);
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    const res = await (await this.getClient()).query(this.prepareSql(sql), params);
    return res.rows[0];
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: string | number | bigint, changes: number }> {
    const client = await this.getClient();
    const res = await client.query(this.prepareSql(sql), params);
    return {
      changes: res.rowCount || 0,
      lastID: res.rows[0]?.id
    };
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const client = await this.pgPool!.connect();
    try {
      await client.query('BEGIN');
      const result = await this.transactionStorage.run(client, fn);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    this.logger.info('Banco de dados fechado');
  }

  // --- Métodos de Utilidade ---

  async saveConversation(userPhone: string, direction: 'in' | 'out', message: string, tenantId: string = 'system-default', instanceId?: string): Promise<void> {
    const userId = await this.ensureUserExists(userPhone, tenantId);
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.run(
      'INSERT INTO conversations(id, tenant_id, user_id, direction, message) VALUES(?, ?, ?, ?, ?)',
      [id, tenantId, userId, direction, message]
    );
  }

  private async ensureUserExists(phone: string, tenantId: string): Promise<string> {
    const existing = await this.get<{ id: string }>('SELECT id FROM users WHERE phone = ? AND tenant_id = ?', [phone, tenantId]);
    if (existing) return existing.id;

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.run(
      'INSERT INTO users(id, tenant_id, phone, type) VALUES(?, ?, ?, ?)',
      [id, tenantId, phone, 'lead']
    );
    return id;
  }

  async getRecentMessages(userId: string, tenantId: string, limit: number = 6): Promise<any[]> {
    const messages = await this.query<any>(`
        SELECT content, is_from_me as "isFromMe", timestamp 
        FROM web_messages 
        WHERE tenant_id = ? AND conversation_id IN (
          SELECT id FROM web_conversations 
          WHERE tenant_id = ? AND (whatsapp_chat_id = ? OR whatsapp_chat_id LIKE ?)
        )
        ORDER BY timestamp DESC
        LIMIT ?
      `, [tenantId, tenantId, userId, `%${userId}%`, limit]);

    return messages.reverse();
  }

  async saveLead(tenantId: string, userId: string, data: { name?: string, phone?: string, email?: string, [key: string]: any }): Promise<void> {
    const leadId = `lead_${userId}`;
    const extraData = JSON.stringify(data);

    await this.run(`
      INSERT INTO bot_leads (id, tenant_id, user_id, name, phone, email, data, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, bot_leads.name),
        phone = COALESCE(EXCLUDED.phone, bot_leads.phone),
        email = COALESCE(EXCLUDED.email, bot_leads.email),
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at
    `, [leadId, tenantId, userId, data.name, data.phone, data.email, extraData]);
  }

  async logEvent(tenantId: string, userId: string, eventType: string, eventPath?: string, metadata?: any): Promise<void> {
    await this.run(`
      INSERT INTO bot_events (tenant_id, user_id, event_type, event_path, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `, [tenantId, userId, eventType, eventPath, metadata ? JSON.stringify(metadata) : null]);
  }

  async getKnowledgeBase(tenantId: string): Promise<any[]> {
    return this.query<any>(`
      SELECT title, content, category FROM bot_knowledge_base
      WHERE tenant_id = $1 AND active = TRUE
    `, [tenantId]);
  }

  async upsertCustomer(tenantId: string, whatsappId: string, data: { name?: string, phone?: string, email?: string, isAI?: boolean, isAgent?: boolean }): Promise<void> {
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const phone = data.phone || whatsappId.split('@')[0];

    await this.run(`
      INSERT INTO web_customers (
        id, tenant_id, whatsapp_id, name, phone_number, email, 
        last_interaction, total_messages, ai_messages_count, agent_messages_count, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 1, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id, whatsapp_id) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, web_customers.name),
        phone_number = COALESCE(EXCLUDED.phone_number, web_customers.phone_number),
        email = COALESCE(EXCLUDED.email, web_customers.email),
        last_interaction = CURRENT_TIMESTAMP,
        total_messages = web_customers.total_messages + 1,
        ai_messages_count = web_customers.ai_messages_count + $7,
        agent_messages_count = web_customers.agent_messages_count + $8,
        updated_at = CURRENT_TIMESTAMP
    `, [
      customerId,
      tenantId,
      whatsappId,
      data.name,
      phone,
      data.email,
      data.isAI ? 1 : 0,
      data.isAgent ? 1 : 0
    ]);
  }

  async updateCustomerRating(tenantId: string, whatsappId: string, rating: number): Promise<void> {
    await this.run(`
      UPDATE web_customers
      SET 
        avg_rating = (avg_rating * ratings_count + $1) / (ratings_count + 1),
        ratings_count = ratings_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $2 AND whatsapp_id = $3
    `, [rating, tenantId, whatsappId]);
  }
}
