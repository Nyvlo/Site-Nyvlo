import { DatabaseService } from './database-service';
import { LogService } from './log-service';
import { BotConfig, Course, FAQCategory, FAQQuestion } from '../types/config';
import { ConfigLoader } from '../config/config-loader';
import { IndustryTemplateService } from './industry-template-service';

export class TenantConfigService {
    private database: DatabaseService;
    private logger: LogService;
    private cache: Map<string, { config: BotConfig; expires: number }> = new Map();
    private CACHE_TTL = 1000 * 60 * 5; // 5 minutos de cache

    constructor(database: DatabaseService, logger: LogService) {
        this.database = database;
        this.logger = logger;
    }

    async getBotConfig(tenantId: string): Promise<BotConfig> {
        // 1. Verificar Cache
        const cached = this.cache.get(tenantId);
        if (cached && cached.expires > Date.now()) {
            return cached.config;
        }

        try {
            this.logger.info(`Carregando configuração dinâmica para o tenant: ${tenantId}`);

            // 2. Buscar Tenant e BotSettings
            const tenant = await this.database.get<any>('SELECT * FROM tenants WHERE id = ?', [tenantId]);
            if (!tenant) {
                this.logger.warn(`Tenant ${tenantId} não encontrado, usando configuração padrão.`);
                return ConfigLoader.load();
            }

            const settings = await this.database.get<any>('SELECT * FROM bot_settings WHERE tenant_id = ?', [tenantId]);

            // 3. Buscar FAQ e Cursos
            const courses = await this.database.query<any>('SELECT * FROM bot_courses WHERE tenant_id = ? AND active = TRUE', [tenantId]);
            const faqCategories = await this.database.query<any>('SELECT * FROM bot_faq_categories WHERE tenant_id = ? ORDER BY sort_order', [tenantId]);
            const faqQuestions = await this.database.query<any>('SELECT * FROM bot_faq_questions WHERE tenant_id = ? ORDER BY sort_order', [tenantId]);
            const keywordRows = await this.database.query<any>('SELECT * FROM bot_keywords WHERE tenant_id = ?', [tenantId]);
            const formRows = await this.database.query<any>('SELECT * FROM bot_forms WHERE tenant_id = ? AND active = TRUE', [tenantId]);
            const formStepRows = await this.database.query<any>(`
                SELECT fs.* FROM bot_form_steps fs 
                JOIN bot_forms f ON fs.form_id = f.id 
                WHERE f.tenant_id = ? ORDER BY fs.sort_order
            `, [tenantId]);

            // 4. Mapear para o formato BotConfig
            const defaultConfig = ConfigLoader.load(); // Fallback para valores não definidos no banco

            const keywords: Record<string, string> = {};
            keywordRows.forEach((row: any) => {
                keywords[row.keyword.toLowerCase()] = row.target_state;
            });

            // Prepare AI Config
            const aiConfig = settings?.ai_config ? JSON.parse(settings.ai_config) : defaultConfig.ai;

            // Enforce plan limit for AI
            if (!tenant.ai_enabled) {
                aiConfig.enabled = false;
            }

            // Industry Template Integration
            const industryType = tenant.industry_type || 'general';
            const template = IndustryTemplateService.getTemplate(industryType);

            const config: BotConfig = {
                company: {
                    name: tenant.name,
                    address: tenant.address || defaultConfig.company.address,
                    phone: tenant.phone || defaultConfig.company.phone,
                    email: tenant.email || defaultConfig.company.email,
                    website: tenant.website || defaultConfig.company.website,
                    industryType: industryType,
                },
                businessHours: settings?.business_hours ? JSON.parse(settings.business_hours) : defaultConfig.businessHours,
                bot: {
                    ...defaultConfig.bot,
                    sessionTimeout: settings?.session_timeout || defaultConfig.bot.sessionTimeout,
                    catalogLabel: settings?.catalog_label || template.labels.catalog,
                },
                messages: {
                    welcome: settings?.welcome_message || template.defaultWelcome || defaultConfig.messages.welcome,
                    goodbye: settings?.goodbye_message || defaultConfig.messages.goodbye,
                    invalidOption: settings?.invalid_option_message || defaultConfig.messages.invalidOption,
                    outsideHours: settings?.outside_hours_message || defaultConfig.messages.outsideHours,
                    transferToHuman: settings?.transfer_message || defaultConfig.messages.transferToHuman,
                    noHumanAvailable: settings?.no_agent_message || defaultConfig.messages.noHumanAvailable,
                    appointmentConfirmation: defaultConfig.messages.appointmentConfirmation,
                    appointmentReminder: defaultConfig.messages.appointmentReminder,
                    enrollmentComplete: defaultConfig.messages.enrollmentComplete,
                },
                menus: settings?.menus ? JSON.parse(settings.menus) : template.defaultMenu,
                courses: courses.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    duration: c.duration,
                    workload: c.workload,
                    price: parseFloat(c.price),
                    prerequisites: JSON.parse(c.prerequisites || '[]'),
                    documents: JSON.parse(c.documents || '[]'),
                    active: !!c.active
                })),
                faq: {
                    categories: faqCategories.map((cat: any) => ({
                        id: cat.id,
                        name: cat.name,
                        icon: cat.icon,
                        order: cat.sort_order
                    })),
                    questions: faqQuestions.map((q: any) => ({
                        id: q.id,
                        categoryId: q.category_id,
                        question: q.question,
                        answer: q.answer,
                        keywords: JSON.parse(q.keywords || '[]'),
                        order: q.sort_order
                    }))
                },
                ai: aiConfig,
                keywords: Object.keys(keywords).length > 0 ? keywords : undefined,
                webhook: settings?.webhook_url ? {
                    url: settings.webhook_url,
                    events: JSON.parse(settings.webhook_events || '[]')
                } : undefined,
                payment: settings?.payment_provider ? {
                    provider: settings.payment_provider as any,
                    apiKey: JSON.parse(settings.payment_config || '{}').apiKey,
                    isSandbox: JSON.parse(settings.payment_config || '{}').isSandbox
                } : undefined,
                forms: formRows.length > 0 ? formRows.map((f: any) => ({
                    id: f.id,
                    name: f.name,
                    description: f.description,
                    steps: formStepRows.filter((fs: any) => fs.form_id === f.id).map((fs: any) => ({
                        id: fs.id,
                        question: fs.question,
                        fieldName: fs.field_name,
                        validationType: fs.validation_type,
                        order: fs.sort_order
                    }))
                })) : [
                    {
                        id: 'default_lead_form',
                        name: `Cadastro de Cliente / Interessado`,
                        description: `Formulário automático para ${template.industry}`,
                        steps: template.leadQuestions.map((q: any, i: number) => ({
                            id: `step_${i}`,
                            question: q.question,
                            fieldName: q.field,
                            validationType: 'text',
                            order: i
                        }))
                    }
                ]
            };

            // 5. Salvar no Cache
            this.cache.set(tenantId, {
                config,
                expires: Date.now() + this.CACHE_TTL
            });

            return config;
        } catch (error) {
            this.logger.error(`Erro ao carregar configuração do tenant ${tenantId}`, error as Error);
            return ConfigLoader.load();
        }
    }

    // Método para limpar cache quando houver atualização no painel
    invalidateCache(tenantId: string) {
        this.cache.delete(tenantId);
    }
}
