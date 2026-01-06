import { StateManager } from './state-manager';
import { BotConfig, MenuItem } from '../types/config';
import { IncomingMessage, BotResponse } from '../types/messages';
import { BotState, UserState } from '../types/state';
import { LogService } from '../services/log-service';
import { AIService } from '../services/ai-service';
import { CacheService } from '../services/cache-service';
import { DatabaseService } from '../services/database-service';
import { TenantConfigService } from '../services/tenant-config-service';
import { WebhookService } from '../services/webhook-service';
import { PaymentService } from '../services/payment-service';
import { IndustryTemplateService } from '../services/industry-template-service';
import { SchedulingService } from '../services/scheduling-service';

interface Intent {
  type: 'menu_selection' | 'keyword' | 'command' | 'free_text';
  value: string;
  confidence: number;
}

const GLOBAL_KEYWORD_MAP: Record<string, BotState> = {
  'curso': BotState.COURSES_LIST,
  'cursos': BotState.COURSES_LIST,
  'formação': BotState.COURSES_LIST,
  'formacao': BotState.COURSES_LIST,
  'agendar': BotState.APPOINTMENT_START,
  'agendamento': BotState.APPOINTMENT_START,
  'visita': BotState.APPOINTMENT_START,
  'marcar': BotState.APPOINTMENT_START,
  'matrícula': BotState.ENROLLMENT_START,
  'matricula': BotState.ENROLLMENT_START,
  'inscrição': BotState.ENROLLMENT_START,
  'inscricao': BotState.ENROLLMENT_START,
  'dúvida': BotState.FAQ_CATEGORIES,
  'duvida': BotState.FAQ_CATEGORIES,
  'pergunta': BotState.FAQ_CATEGORIES,
  'ajuda': BotState.FAQ_CATEGORIES,
  'atendente': BotState.HUMAN_TRANSFER,
  'humano': BotState.HUMAN_TRANSFER,
  'falar': BotState.HUMAN_TRANSFER,
  'documento': BotState.DOCUMENTS,
  'documentos': BotState.DOCUMENTS,
};

export class MessageHandler {
  private stateManager: StateManager;
  private logger: LogService;
  private database: DatabaseService;
  private tenantConfigService: TenantConfigService;
  private aiService: AIService | null = null;
  private cacheService: CacheService | null = null;
  private webhookService: WebhookService | null = null;
  private paymentService: PaymentService | null = null;
  private schedulingService: SchedulingService;
  private config: BotConfig | null = null;
  private currentTenantId: string = 'system-default';

  constructor(
    stateManager: StateManager,
    logger: LogService,
    database: DatabaseService,
    tenantConfigService: TenantConfigService,
    cacheService?: CacheService,
    webhookService?: WebhookService,
    paymentService?: PaymentService,
    schedulingService?: SchedulingService
  ) {
    this.stateManager = stateManager;
    this.logger = logger;
    this.database = database;
    this.tenantConfigService = tenantConfigService;
    this.cacheService = cacheService || null;
    this.webhookService = webhookService || null;
    this.paymentService = paymentService || null;
    // Fallback if not provided (migration safe)
    this.schedulingService = schedulingService || new SchedulingService(database, logger);
  }

  async handle(message: IncomingMessage, replyFn?: (to: string, message: string) => Promise<void>): Promise<BotResponse> {
    const userId = message.from;
    const tenantId = message.tenantId || 'system-default';
    this.currentTenantId = tenantId;

    const config = await this.tenantConfigService.getBotConfig(tenantId);
    this.config = config;

    if (config.ai?.enabled) {
      this.aiService = new AIService(config.ai, config, this.logger);
    }

    // Check tenant status and expiry
    const tenant = await this.database.get<any>('SELECT status, expires_at FROM tenants WHERE id = ?', [tenantId]);
    if (tenant) {
      if (tenant.status !== 'active') {
        this.logger.warn(`Tenant ${tenantId} inativo (${tenant.status}). Bot suspenso.`);
        return this.createResponse(['O serviço desta empresa está temporariamente suspenso.'], BotState.HUMAN_TRANSFER);
      }

      if (tenant.expires_at) {
        const expiry = new Date(tenant.expires_at);
        const now = new Date();
        if (expiry < now) {
          const graceLimit = new Date(expiry);
          graceLimit.setDate(graceLimit.getDate() + 3);

          if (now > graceLimit) {
            this.logger.warn(`Tenant ${tenantId} expirado e fora da carência. Bot suspenso.`);
            return this.createResponse(['O serviço desta empresa expirou. Por favor, entre em contato com o suporte.'], BotState.HUMAN_TRANSFER);
          }

          // Within grace period - we continue but log info
          this.logger.info(`Tenant ${tenantId} operando em período de carência (vencido em ${tenant.expires_at}).`);
        }
      }
    }

    this.logger.info('Mensagem recebida', { from: userId, text: message.text, type: message.messageType, tenantId });

    try {
      await this.database.saveConversation(userId, 'in', message.text, message.tenantId, message.instanceId);
      // Fase 1: Registrar Lead
      await this.database.saveLead(tenantId, userId, { phone: userId });
    } catch (error) {
      this.logger.error('Erro ao salvar conversa/lead recebida', error as Error);
    }

    if (message.messageType === 'audio') {
      const response = this.createResponse(
        ['Desculpe, não consigo processar mensagens de áudio. Por favor, envie sua mensagem em texto.'],
        BotState.MAIN_MENU
      );
      await this.saveOutgoingMessages(userId, response.messages, message.tenantId, message.instanceId);
      return response;
    }

    if (message.messageType === 'sticker') {
      const response = this.createResponse(
        ['😊 Olá! Para melhor atendê-lo, por favor utilize as opções do menu.'],
        BotState.MAIN_MENU
      );
      await this.saveOutgoingMessages(userId, response.messages, message.tenantId, message.instanceId);
      return response;
    }

    const isTimedOut = await this.stateManager.checkTimeout(userId);
    if (isTimedOut) {
      await this.stateManager.resetState(userId);
    }

    const state = await this.stateManager.getState(userId);
    const intent = this.identifyIntent(message.text, state.currentState);

    if (intent.type === 'command') {
      if (intent.value === 'menu' || intent.value === '0') {
        if (state.currentState === BotState.MAIN_MENU && (state.context.currentMenuPath || []).length > 0) {
          const path = [...(state.context.currentMenuPath || [])];
          path.pop();
          await this.stateManager.updateContext(userId, { currentMenuPath: path });
          const newState = await this.stateManager.getState(userId);
          const response = this.generateMainMenu(newState);
          await this.saveOutgoingMessages(userId, response.messages, message.tenantId, message.instanceId);
          return response;
        }

        await this.stateManager.transition(userId, BotState.MAIN_MENU);
        await this.stateManager.updateContext(userId, { currentMenuPath: [] });
        const newState = await this.stateManager.getState(userId);
        const response = this.generateMainMenu(newState);
        await this.saveOutgoingMessages(userId, response.messages, message.tenantId, message.instanceId);
        return response;
      }
    }

    const shouldUseAI =
      this.aiService &&
      this.aiService.isEnabled() &&
      (state.currentState === BotState.WELCOME || state.currentState === BotState.MAIN_MENU) &&
      intent.type !== 'menu_selection' &&
      intent.type !== 'command';

    if (shouldUseAI) {
      try {
        const history = await this.database.getRecentMessages(userId, message.tenantId, 6);
        const historyText = history.map((h: { isFromMe: boolean; content: string }) =>
          `${h.isFromMe ? 'Assistente' : 'Cliente'}: ${h.content}`
        );

        // Fase 2: Buscar Base de Conhecimento
        const knowledge = await this.database.getKnowledgeBase(this.currentTenantId);
        const knowledgeContext = knowledge.map(k => `[${k.title}]: ${k.content}`).join('\n');

        const aiResponse = await this.aiService!.processMessage(message.text, historyText, knowledgeContext);

        if (aiResponse.action === 'continue' || aiResponse.action === 'enrollment' || aiResponse.action === 'appointment') {
          const response: BotResponse = {
            messages: [aiResponse.message],
            nextState: state.currentState
          };
          await this.saveOutgoingMessages(userId, response.messages, message.tenantId, message.instanceId);
          if (replyFn) await replyFn(userId, aiResponse.message);
          return response;
        }

        if (aiResponse.action === 'menu') {
          if (replyFn) await replyFn(userId, aiResponse.message);
          await this.stateManager.transition(userId, BotState.MAIN_MENU);
        }

        if (aiResponse.action === 'transfer') {
          const response: BotResponse = {
            messages: [aiResponse.message],
            nextState: BotState.HUMAN_TRANSFER
          };
          await this.saveOutgoingMessages(userId, response.messages, message.tenantId, message.instanceId);
          if (replyFn) await replyFn(userId, aiResponse.message);
          return response;
        }
      } catch (err) {
        this.logger.error('Erro ao processar IA', err as Error);
      }
    }

    const freshState = await this.stateManager.getState(userId);
    const freshIntent = this.identifyIntent(message.text, freshState.currentState);
    const response = await this.processState(userId, freshState.currentState, message.text, freshIntent);

    await this.saveOutgoingMessages(userId, response.messages, message.tenantId, message.instanceId);

    if (replyFn) {
      for (const msg of response.messages) {
        await replyFn(userId, msg);
      }
    }

    return response;
  }

  identifyIntent(text: string, currentState: BotState): Intent {
    const normalized = text.toLowerCase().trim();

    if (normalized === 'menu' || normalized === '0' || normalized === 'início' || normalized === 'inicio') {
      return { type: 'command', value: 'menu', confidence: 1 };
    }

    if (normalized === 'voltar' || normalized === 'v') {
      return { type: 'command', value: 'back', confidence: 1 };
    }

    if (/^\d+$/.test(normalized)) {
      return { type: 'menu_selection', value: normalized, confidence: 1 };
    }

    const tenantKeywords = this.config?.keywords || {};
    const combinedKeywords = { ...GLOBAL_KEYWORD_MAP, ...tenantKeywords };

    for (const [keyword, _state] of Object.entries(combinedKeywords)) {
      if (normalized.includes(keyword)) {
        return { type: 'keyword', value: keyword, confidence: 0.8 };
      }
    }

    const fuzzyMatches = this.fuzzyMatch(normalized);
    if (fuzzyMatches) {
      return { type: 'keyword', value: fuzzyMatches, confidence: 0.6 };
    }

    return { type: 'free_text', value: text, confidence: 0.3 };
  }

  private fuzzyMatch(text: string): string | null {
    const typoMap: Record<string, string> = {
      'curs': 'curso',
      'matricla': 'matrícula',
      'agendr': 'agendar',
      'duvda': 'dúvida',
      'ajud': 'ajuda',
      'atendent': 'atendente',
    };

    for (const [typo, correct] of Object.entries(typoMap)) {
      if (text.includes(typo)) return correct;
    }
    return null;
  }

  private async processState(userId: string, currentState: BotState, input: string, intent: Intent): Promise<BotResponse> {
    const state = await this.stateManager.getState(userId);

    switch (currentState) {
      case BotState.WELCOME:
        await this.stateManager.transition(userId, BotState.MAIN_MENU);
        return this.generateWelcome(await this.stateManager.getState(userId));

      case BotState.MAIN_MENU:
        return this.handleMainMenu(userId, input, intent, state);

      case BotState.COURSES_LIST:
        return this.handleCoursesList(userId, input);

      case BotState.COURSE_DETAIL:
        return this.handleCourseDetail(userId, input);

      case BotState.FAQ_CATEGORIES:
        return this.handleFAQCategories(userId, input);

      case BotState.FAQ_QUESTIONS:
        return this.handleFAQQuestions(userId, input, state);

      case BotState.FAQ_ANSWER:
        return this.handleFAQAnswer(userId, input);

      case BotState.PAYMENT_PENDING:
        return this.handlePaymentPending(userId, input);

      case BotState.DYNAMIC_FORM:
        return this.handleDynamicForm(userId, input);

      case BotState.APPOINTMENT_START:
        return this.handleAppointmentStart(userId, input);
      case BotState.APPOINTMENT_DATE:
        return this.handleAppointmentDate(userId, input);
      case BotState.APPOINTMENT_TIME:
        return this.handleAppointmentTime(userId, input);
      case BotState.APPOINTMENT_CONFIRM:
        return this.handleAppointmentConfirm(userId, input);

      default:
        const tenantKeywords = this.config?.keywords || {};
        const combinedKeywords: Record<string, any> = { ...GLOBAL_KEYWORD_MAP, ...tenantKeywords };

        if (intent.type === 'keyword' && combinedKeywords[intent.value]) {
          const targetState = combinedKeywords[intent.value] as BotState;
          await this.stateManager.transition(userId, targetState);
          return this.processState(userId, targetState, input, intent);
        }
        return this.handleUnknownIntent(state);
    }
  }

  private generateWelcome(state: UserState): BotResponse {
    const path = state.context.currentMenuPath || [];
    const items = this.findCurrentMenuItems(path);
    const welcomeText = this.generateMainMenuText(items);
    return this.createResponse([welcomeText], BotState.MAIN_MENU);
  }

  private generateMainMenu(state: UserState): BotResponse {
    const path = state.context.currentMenuPath || [];
    const items = this.findCurrentMenuItems(path);
    return this.createResponse([this.generateMenuText(items)], BotState.MAIN_MENU);
  }

  private generateMainMenuText(items?: MenuItem[]): string {
    if (!this.config) return 'Bem-vindo!';
    const welcome = this.config.messages.welcome.replace('{empresa}', this.config.company.name);
    return `${welcome}\n\n${this.generateMenuText(items || this.config.menus || [])}`;
  }

  private generateMenuText(items?: MenuItem[], title: string = 'Menu Principal'): string {
    if (!this.config) return 'Menu Principal';
    const displayItems = items || (title === 'Menu Principal' ? this.config.menus : []) || [];
    const catalogLabel = this.config.bot.catalogLabel || 'Cursos';

    if (displayItems.length === 0 && (title === 'Menu Principal' || title === 'Início')) {
      const industry = this.config.company.industryType || 'general';
      const template = IndustryTemplateService.getTemplate(industry);
      const labels = template.labels;

      return `📋 *${title}*\n\n1️⃣ ${labels.catalog} disponíveis\n2️⃣ ${labels.appointment}\n3️⃣ ${labels.enrollment}\n4️⃣ Perguntas frequentes\n5️⃣ Falar com atendente\n6️⃣ Enviar documentos\n\nDigite a opção ou escreva sua dúvida.`;
    }

    let text = `📋 *${title}*\n\n`;
    displayItems.forEach((item, index) => {
      text += `${this.getNumberEmoji(index + 1)} ${item.title}\n`;
    });

    if (title !== 'Menu Principal' && title !== 'Início') {
      text += `\n0️⃣ Voltar ao menu anterior`;
    }

    text += `\n\nDigite o número da opção desejada.`;
    return text;
  }

  private getNumberEmoji(num: number): string {
    const emojis: Record<number, string> = { 1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟' };
    return emojis[num] || `${num}.`;
  }

  private findCurrentMenuItems(path: string[]): MenuItem[] {
    if (!this.config) return [];
    let current = this.config.menus || [];
    if (!path || path.length === 0) return current;

    for (const id of path) {
      const item = current.find(i => i.id === id);
      if (item && item.subItems) {
        current = item.subItems;
      } else {
        return [];
      }
    }
    return current;
  }

  private async handleMainMenu(userId: string, input: string, intent: Intent, state: UserState): Promise<BotResponse> {
    if (!this.config) return this.generateMainMenu(state);
    const path = state.context.currentMenuPath || [];
    const currentItems = this.findCurrentMenuItems(path);

    if (this.aiService && intent.type !== 'menu_selection' && intent.confidence < 0.9) {
      return this.handleWithAI(userId, input);
    }

    if (intent.type === 'menu_selection') {
      const option = parseInt(intent.value);

      if (option === 0) {
        if (path.length > 0) {
          const newPath = [...path];
          newPath.pop();
          await this.stateManager.updateContext(userId, { currentMenuPath: newPath });
          return this.generateMainMenu(await this.stateManager.getState(userId));
        }
        return this.generateMainMenu(state);
      }

      if (!currentItems || currentItems.length === 0) {
        switch (option) {
          case 1:
            await this.stateManager.transition(userId, BotState.COURSES_LIST);
            await this.database.logEvent(this.currentTenantId, userId, 'catalog_viewed');
            return this.generateCoursesList();
          case 2:
            await this.stateManager.transition(userId, BotState.APPOINTMENT_START);
            return this.generateAppointmentStart(userId, this.currentTenantId);
          case 3:
            await this.stateManager.transition(userId, BotState.ENROLLMENT_START);
            return this.generateEnrollmentStart(userId, this.currentTenantId);
          case 4:
            await this.stateManager.transition(userId, BotState.FAQ_CATEGORIES);
            return this.generateFAQCategories();
          case 5:
            await this.stateManager.transition(userId, BotState.HUMAN_TRANSFER);
            return this.generateHumanTransfer(userId, this.currentTenantId);
          case 6:
            await this.stateManager.transition(userId, BotState.DOCUMENTS);
            return this.generateDocumentsMenu();
          default:
            return this.createResponse([this.config.messages.invalidOption, this.generateMenuText([])], BotState.MAIN_MENU);
        }
      }

      if (option > 0 && option <= currentItems.length) {
        return this.executeMenuAction(userId, currentItems[option - 1], path);
      }

      return this.createResponse([this.config.messages.invalidOption, this.generateMenuText(currentItems)], BotState.MAIN_MENU);
    }

    const tenantKeywords = this.config?.keywords || {};
    const combinedKeywords: Record<string, any> = { ...GLOBAL_KEYWORD_MAP, ...tenantKeywords };
    if (intent.type === 'keyword' && combinedKeywords[intent.value]) {
      const targetState = combinedKeywords[intent.value] as BotState;
      await this.stateManager.transition(userId, targetState);
      return this.processState(userId, targetState, input, intent);
    }

    if (this.aiService) return this.handleWithAI(userId, input);
    return this.createResponse([this.config.messages.invalidOption, this.generateMenuText(currentItems)], BotState.MAIN_MENU);
  }

  private async executeMenuAction(userId: string, item: MenuItem, currentPath: string[]): Promise<BotResponse> {
    if (!this.config) return this.createResponse(['Erro'], BotState.MAIN_MENU);
    switch (item.action) {
      case 'submenu':
        const newPath = [...currentPath, item.id];
        await this.stateManager.updateContext(userId, { currentMenuPath: newPath });
        return this.createResponse([this.generateMenuText(item.subItems || [], item.title)], BotState.MAIN_MENU);
      case 'courses':
        await this.stateManager.transition(userId, BotState.COURSES_LIST);
        await this.database.logEvent(this.currentTenantId, userId, 'catalog_viewed');
        return this.generateCoursesList();
      case 'appointment':
        await this.stateManager.transition(userId, BotState.APPOINTMENT_START);
        return this.generateAppointmentStart(userId, this.currentTenantId);
      case 'enrollment':
        await this.stateManager.transition(userId, BotState.ENROLLMENT_START);
        return this.generateEnrollmentStart(userId, this.currentTenantId);
      case 'faq':
        await this.stateManager.transition(userId, BotState.FAQ_CATEGORIES);
        return this.generateFAQCategories();
      case 'human':
        await this.stateManager.transition(userId, BotState.HUMAN_TRANSFER);
        return this.generateHumanTransfer(userId, this.currentTenantId);
      case 'contact':
        const contactInfo = `📍 *Localização*\n\n${this.config.company.address}\n\n📞 *Fone:* ${this.config.company.phone}\n📧 *Email:* ${this.config.company.email}`;
        return this.createResponse([contactInfo, this.generateMenuText(this.findCurrentMenuItems(currentPath))], BotState.MAIN_MENU);
      case 'documents':
        await this.stateManager.transition(userId, BotState.DOCUMENTS);
        return this.generateDocumentsMenu();
      case 'custom':
        return this.createResponse([item.customResponse || 'Ok.', this.generateMenuText(this.findCurrentMenuItems(currentPath))], BotState.MAIN_MENU);
      case 'form':
        return this.startDynamicForm(userId, item.id);
      default:
        return this.createResponse(['Ação não implementada.', this.generateMenuText(this.findCurrentMenuItems(currentPath))], BotState.MAIN_MENU);
    }
  }

  private async startDynamicForm(userId: string, formId: string): Promise<BotResponse> {
    const form = this.config?.forms?.find(f => f.id === formId);
    if (!form || form.steps.length === 0) {
      return this.createResponse(['Este formulário não está disponível no momento.'], BotState.MAIN_MENU);
    }

    await this.stateManager.updateContext(userId, {
      currentForm: {
        formId,
        currentStep: 0,
        data: {}
      }
    });
    await this.stateManager.transition(userId, BotState.DYNAMIC_FORM);
    await this.database.logEvent(this.currentTenantId, userId, 'form_start', formId);

    return this.createResponse([`📋 *${form.name}*\n\n${form.steps[0].question}`], BotState.DYNAMIC_FORM);
  }

  private async handleDynamicForm(userId: string, input: string): Promise<BotResponse> {
    const state = await this.stateManager.getState(userId);
    const formCtx = state.context.currentForm;

    if (!formCtx || !this.config) {
      await this.stateManager.transition(userId, BotState.MAIN_MENU);
      return this.generateMainMenu(state);
    }

    const form = this.config.forms?.find(f => f.id === formCtx.formId);
    if (!form) {
      await this.stateManager.transition(userId, BotState.MAIN_MENU);
      return this.generateMainMenu(state);
    }

    if (input === '0') {
      await this.stateManager.transition(userId, BotState.MAIN_MENU);
      await this.stateManager.updateContext(userId, { currentForm: undefined });
      return this.generateMainMenu(await this.stateManager.getState(userId));
    }

    const currentStep = form.steps[formCtx.currentStep];

    // Validação básica
    if (currentStep.validationType === 'email' && !input.includes('@')) {
      return this.createResponse(['Por favor, informe um e-mail válido.', currentStep.question], BotState.DYNAMIC_FORM);
    }

    const newData = { ...formCtx.data, [currentStep.fieldName]: input };
    const nextStepIndex = formCtx.currentStep + 1;

    if (nextStepIndex < form.steps.length) {
      await this.stateManager.updateContext(userId, {
        currentForm: { ...formCtx, currentStep: nextStepIndex, data: newData }
      });
      return this.createResponse([form.steps[nextStepIndex].question], BotState.DYNAMIC_FORM);
    } else {
      // Finalizou o formulário
      await this.stateManager.updateContext(userId, { currentForm: undefined });
      await this.stateManager.transition(userId, BotState.MAIN_MENU);

      // Notificar Webhook
      this.notifyWebhook('form_complete', { formId: form.id, formName: form.name, userId, data: newData });

      // Fase 1: Log Event e Save Lead Data
      await this.database.logEvent(this.currentTenantId, userId, 'form_complete', form.id, newData);
      await this.database.saveLead(this.currentTenantId, userId, newData);

      return this.createResponse([`✅ *${form.name}* concluído com sucesso! Obrigado pelas informações.`, this.generateMenuText(this.config.menus || [])], BotState.MAIN_MENU);
    }
  }

  private async notifyWebhook(event: string, payload: any): Promise<void> {
    if (this.webhookService && this.config?.webhook?.url && this.config.webhook.events.includes(event)) {
      this.webhookService.notify(this.config.webhook.url, event, payload);
    }
  }

  private async handleWithAI(userId: string, input: string): Promise<BotResponse> {
    if (!this.aiService || !this.config) return this.createResponse(['Desculpe.'], BotState.MAIN_MENU);
    try {
      const state = await this.stateManager.getState(userId);
      const aiResponse = await this.aiService.processMessage(input, state.context.conversationHistory || []);
      const newHistory = [...(state.context.conversationHistory || []), `Usuário: ${input}`, `Bot: ${aiResponse.message}`].slice(-10);
      await this.stateManager.updateContext(userId, { conversationHistory: newHistory });

      switch (aiResponse.action) {
        case 'transfer':
          await this.stateManager.transition(userId, BotState.HUMAN_TRANSFER);
          await this.stateManager.updateContext(userId, { appointmentData: undefined });
          return this.generateHumanTransfer(userId, this.currentTenantId);
        case 'appointment': await this.stateManager.transition(userId, BotState.APPOINTMENT_START); return this.createResponse([aiResponse.message], BotState.APPOINTMENT_START);
        case 'enrollment': await this.stateManager.transition(userId, BotState.ENROLLMENT_START); return this.createResponse([aiResponse.message], BotState.ENROLLMENT_START);
        case 'menu': return this.createResponse([aiResponse.message, this.generateMenuText(this.config.menus || [])], BotState.MAIN_MENU);
        default: return this.createResponse([aiResponse.message], BotState.MAIN_MENU);
      }
    } catch (error) {
      return this.createResponse(['Erro técnico.', this.generateMenuText(this.config.menus || [])], BotState.MAIN_MENU);
    }
  }

  private generateCoursesList(): BotResponse {
    const label = this.config?.bot.catalogLabel || 'Cursos';
    const activeCourses = this.config?.courses.filter(c => c.active) || [];
    let message = `📚 *${label} Disponíveis*\n\n`;
    activeCourses.forEach((course, index) => { message += `${index + 1}. *${course.name}*\n   ${course.description}\n\n`; });
    message += `\nDigite o número para detalhes ou 0 para voltar.`;
    return this.createResponse([message], BotState.COURSES_LIST);
  }

  private async handleCoursesList(userId: string, input: string): Promise<BotResponse> {
    if (!this.config) return this.generateMainMenu(await this.stateManager.getState(userId));
    const num = parseInt(input);
    const activeCourses = this.config.courses.filter(c => c.active);
    if (num > 0 && num <= activeCourses.length) {
      const course = activeCourses[num - 1];
      await this.stateManager.updateContext(userId, { selectedCourse: course.id });
      await this.stateManager.transition(userId, BotState.COURSE_DETAIL);
      await this.database.logEvent(this.currentTenantId, userId, 'item_viewed', course.id);
      return this.generateCourseDetail(course);
    }
    if (num === 0) { await this.stateManager.transition(userId, BotState.MAIN_MENU); return this.generateMainMenu(await this.stateManager.getState(userId)); }
    return this.createResponse([this.config.messages.invalidOption], BotState.COURSES_LIST);
  }

  private generateCourseDetail(course: any): BotResponse {
    const industry = this.config?.company.industryType || 'general';
    const template = IndustryTemplateService.getTemplate(industry);
    const itemLabel = template.labels.itemSingular;

    const message = `📖 *${course.name}*\n\n📝 ${course.description}\n\n⏱️ *Duração:* ${course.duration}\n💰 *Investimento:* R$ ${course.price.toFixed(2)}\n\nDigite:\n1️⃣ Selecionar este ${itemLabel}\n2️⃣ Ver outros\n0️⃣ Voltar`;
    return this.createResponse([message], BotState.COURSE_DETAIL);
  }

  private async handleCourseDetail(userId: string, input: string): Promise<BotResponse> {
    const num = parseInt(input);
    const state = await this.stateManager.getState(userId);
    const selectedCourseId = state.context.selectedCourse;

    if (num === 1) {
      // Se houver configuração de pagamento e preço, redirecionar para PIX
      const course = this.config?.courses.find(c => c.id === selectedCourseId);
      if (course && course.price > 0 && this.config?.payment?.provider && this.config.payment.provider !== 'none') {
        return this.handleBuyCourse(userId, course);
      }

      await this.stateManager.transition(userId, BotState.ENROLLMENT_START);
      return this.generateEnrollmentStart(userId, this.currentTenantId);
    }
    if (num === 2) { await this.stateManager.transition(userId, BotState.COURSES_LIST); return this.generateCoursesList(); }
    if (num === 0) { await this.stateManager.transition(userId, BotState.MAIN_MENU); return this.generateMainMenu(await this.stateManager.getState(userId)); }
    return this.createResponse([this.config?.messages.invalidOption || 'Inválido'], BotState.COURSE_DETAIL);
  }

  private generateFAQCategories(): BotResponse {
    if (!this.config) return this.createResponse(['Erro'], BotState.MAIN_MENU);
    let message = `❓ *Perguntas Frequentes*\n\nSelecione uma categoria:\n\n`;
    this.config.faq.categories.sort((a, b) => a.order - b.order).forEach((cat, index) => { message += `${index + 1}. ${cat.icon} ${cat.name}\n`; });
    message += `\nDigite o número ou 0 para voltar.`;
    return this.createResponse([message], BotState.FAQ_CATEGORIES);
  }

  private async handleFAQCategories(userId: string, input: string): Promise<BotResponse> {
    if (!this.config) return this.generateMainMenu(await this.stateManager.getState(userId));
    const num = parseInt(input);
    const categories = [...this.config.faq.categories].sort((a, b) => a.order - b.order);
    if (num > 0 && num <= categories.length) {
      const category = categories[num - 1];
      await this.stateManager.updateContext(userId, { selectedCategory: category.id });
      await this.stateManager.transition(userId, BotState.FAQ_QUESTIONS);
      return this.generateFAQQuestions(userId, category.id, await this.stateManager.getState(userId));
    }
    if (num === 0) { await this.stateManager.transition(userId, BotState.MAIN_MENU); return this.generateMainMenu(await this.stateManager.getState(userId)); }
    return this.createResponse([this.config.messages.invalidOption], BotState.FAQ_CATEGORIES);
  }

  private generateFAQQuestions(userId: string, categoryId: string, state: UserState): BotResponse {
    if (!this.config) return this.generateMainMenu(state);
    const category = this.config.faq.categories.find(c => c.id === categoryId);
    const questions = this.config.faq.questions.filter(q => q.categoryId === categoryId).sort((a, b) => a.order - b.order);
    this.database.logEvent(this.currentTenantId, userId, 'faq_viewed', category?.name);
    let message = `${category?.icon} *${category?.name}*\n\n`;
    questions.forEach((q, index) => { message += `${index + 1}. ${q.question}\n`; });
    message += `\nDigite o número ou 0 para voltar.`;
    return this.createResponse([message], BotState.FAQ_QUESTIONS);
  }

  private async handleFAQQuestions(userId: string, input: string, state: UserState): Promise<BotResponse> {
    if (!this.config) return this.generateMainMenu(state);
    const categoryId = state.context.selectedCategory;
    if (!categoryId) { await this.stateManager.transition(userId, BotState.FAQ_CATEGORIES); return this.generateFAQCategories(); }
    const num = parseInt(input);
    const questions = this.config.faq.questions.filter(q => q.categoryId === categoryId).sort((a, b) => a.order - b.order);
    if (num > 0 && num <= questions.length) {
      const question = questions[num - 1];
      await this.stateManager.transition(userId, BotState.FAQ_ANSWER);
      return this.generateFAQAnswer(question);
    }
    if (num === 0) { await this.stateManager.transition(userId, BotState.FAQ_CATEGORIES); return this.generateFAQCategories(); }
    return this.createResponse([this.config.messages.invalidOption], BotState.FAQ_QUESTIONS);
  }

  private generateFAQAnswer(question: any): BotResponse {
    const message = `❓ *${question.question}*\n\n${question.answer}\n\n━━━━━━━━━━━━━━━\n1️⃣ Outras dúvidas\n2️⃣ Falar com atendente\n0️⃣ Menu principal`;
    return this.createResponse([message], BotState.FAQ_ANSWER);
  }

  private async handleFAQAnswer(userId: string, input: string): Promise<BotResponse> {
    const num = parseInt(input);
    if (num === 1) { await this.stateManager.transition(userId, BotState.FAQ_CATEGORIES); return this.generateFAQCategories(); }
    if (num === 2) { await this.stateManager.transition(userId, BotState.HUMAN_TRANSFER); return this.generateHumanTransfer(userId, this.currentTenantId); }
    if (num === 0) { await this.stateManager.transition(userId, BotState.MAIN_MENU); return this.generateMainMenu(await this.stateManager.getState(userId)); }
    return this.createResponse([this.config?.messages.invalidOption || 'Inválido'], BotState.FAQ_ANSWER);
  }

  private async handleBuyCourse(userId: string, course: any): Promise<BotResponse> {
    if (!this.paymentService || !this.config?.payment) {
      return this.createResponse(['Pagamento indisponível no momento.', this.generateMenuText(this.config?.menus || [])], BotState.MAIN_MENU);
    }

    try {
      const pix = await this.paymentService.generatePIX(
        this.currentTenantId,
        userId,
        course.id,
        course.price,
        this.config.payment as any
      );

      if (!pix.success) throw new Error(pix.error);

      await this.stateManager.updateContext(userId, {
        currentOrder: {
          orderId: pix.orderId,
          amount: course.price,
          pixCopyPaste: pix.copyPaste,
          pixQrCode: pix.qrCode
        }
      });

      await this.stateManager.transition(userId, BotState.PAYMENT_PENDING);

      let message = `💠 *Pagamento via PIX*\n\n`;
      message += `Item: ${course.name}\n`;
      message += `Valor: R$ ${course.price.toFixed(2)}\n\n`;
      message += `Utilize o código "Copia e Cola" abaixo:\n\n`;
      message += `\`${pix.copyPaste}\`\n\n`;
      message += `Assim que o pagamento for confirmado, você receberá uma notificação automática aqui!\n\n`;
      message += `Digite 0 para cancelar e voltar.`;

      return this.createResponse([message], BotState.PAYMENT_PENDING);
    } catch (error) {
      this.logger.error('Erro ao processar compra', error as Error);
      return this.createResponse(['Desculpe, não conseguimos gerar o seu PIX. Tente novamente mais tarde.'], BotState.COURSE_DETAIL);
    }
  }

  private async handlePaymentPending(userId: string, input: string): Promise<BotResponse> {
    if (input === '0') {
      await this.stateManager.updateContext(userId, { currentOrder: undefined });
      await this.stateManager.transition(userId, BotState.MAIN_MENU);
      return this.generateMainMenu(await this.stateManager.getState(userId));
    }
    return this.createResponse(['Aguardando confirmação do pagamento... Digite 0 para cancelar.'], BotState.PAYMENT_PENDING);
  }

  private generateAppointmentStart(userId: string, tenantId: string): BotResponse {
    const industry = this.config?.company.industryType || 'general';
    const template = IndustryTemplateService.getTemplate(industry);
    const label = template.labels.appointment;

    this.notifyWebhook('appointment_requested', { userId });
    this.database.logEvent(tenantId, userId, 'appointment_requested');
    return this.createResponse([`📅 *${label}*\n\nVamos registrar seu pedido! Em breve um atendente entrará em contato.\n\nDigite 0 para voltar.`], BotState.APPOINTMENT_START);
  }

  private generateEnrollmentStart(userId: string, tenantId: string): BotResponse {
    const industry = this.config?.company.industryType || 'general';
    const template = IndustryTemplateService.getTemplate(industry);
    const label = template.labels.enrollment;

    this.notifyWebhook('enrollment_requested', { userId });
    this.database.logEvent(tenantId, userId, 'enrollment_requested');
    return this.createResponse([`📝 *${label}*\n\nRecebemos seu interesse! Digite seus dados abaixo ou aguarde um retorno.\n\nDigite 0 para voltar.`], BotState.ENROLLMENT_START);
  }

  private generateHumanTransfer(userId: string, tenantId: string): BotResponse {
    if (!this.config) return this.createResponse(['Transferindo...'], BotState.HUMAN_QUEUE);
    this.notifyWebhook('human_transfer_requested', { userId });
    this.database.logEvent(tenantId, userId, 'human_transfer_requested');
    if (!this.isWithinBusinessHours()) { return this.createResponse([this.config.messages.outsideHours.replace('{horario}', this.formatBusinessHours())], BotState.LEAVE_MESSAGE); }
    return this.createResponse([this.config.messages.transferToHuman], BotState.HUMAN_QUEUE);
  }

  private generateDocumentsMenu(): BotResponse {
    return this.createResponse([`📄 *Documentos*\n\n1️⃣ Enviar arquivo\n2️⃣ Solicitar via\n0️⃣ Voltar`], BotState.DOCUMENTS);
  }

  private handleUnknownIntent(state: UserState): BotResponse {
    const items = this.findCurrentMenuItems(state.context.currentMenuPath || []);
    return this.createResponse([`Desculpe, não entendi.\n\n${this.generateMenuText(items)}`], BotState.MAIN_MENU);
  }

  private isWithinBusinessHours(): boolean {
    if (!this.config) return false;
    const now = new Date();
    const day = now.getDay();
    const time = now.getHours() * 100 + now.getMinutes();

    // Fallback to simple hardcoded if no complex scheduling,
    // but we should verify against Scheduling Service eventually.
    // For now simple check.
    return true;
  }

  // Appointment Handlers
  private async handleAppointmentStart(userId: string, input: string): Promise<BotResponse> {
    // Input might be "0" or "back"
    if (input === '0') {
      await this.stateManager.transition(userId, BotState.MAIN_MENU);
      return this.generateMainMenu(await this.stateManager.getState(userId));
    }

    // Try to parse relative dates from input (e.g. "amanhã", "segunda")
    // Simplification: Ask for date explicitly in YYYY-MM-DD or DD/MM
    // Or use a simple regex for DD/MM
    const dateRegex = /(\d{1,2})[\/-](\d{1,2})/;
    const match = input.match(dateRegex);

    let targetDateStr = '';
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = new Date().getFullYear(); // Assume current year
      targetDateStr = `${year}-${month}-${day}`;
    } else if (input.toLowerCase().includes('amanhã') || input.toLowerCase().includes('amanha')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      targetDateStr = d.toISOString().split('T')[0];
    } else if (input.toLowerCase().includes('hoje')) {
      targetDateStr = new Date().toISOString().split('T')[0];
    }

    if (targetDateStr) {
      // We have a date, check slots
      return this.checkSlotsAndPromptTime(userId, targetDateStr);
    }

    return this.createResponse(['Por favor, informe a data desejada (ex: "Amanhã", "25/10").'], BotState.APPOINTMENT_START);
  }

  private async checkSlotsAndPromptTime(userId: string, dateStr: string): Promise<BotResponse> {
    try {
      const slots = await this.schedulingService.getAvailableSlots(this.currentTenantId, dateStr);
      if (slots.length === 0) {
        return this.createResponse([`Não tenho horários livres em ${dateStr}. Por favor, escolha outra data.`], BotState.APPOINTMENT_START);
      }

      await this.stateManager.updateContext(userId, {
        appointmentData: { date: dateStr } as any
      });
      await this.stateManager.transition(userId, BotState.APPOINTMENT_TIME);

      const slotsText = slots.slice(0, 15).join(', ') + (slots.length > 15 ? '...' : '');
      return this.createResponse([`Horários livres para ${dateStr}:\n\n${slotsText}\n\nDigite o horário desejado (ex: 14:00).`], BotState.APPOINTMENT_TIME);
    } catch (e) {
      return this.createResponse(['Erro ao verificar agenda. Tente novamente.'], BotState.APPOINTMENT_START);
    }
  }

  private async handleAppointmentDate(userId: string, input: string): Promise<BotResponse> {
    return this.handleAppointmentStart(userId, input); // Re-use logic
  }

  private async handleAppointmentTime(userId: string, input: string): Promise<BotResponse> {
    if (input === '0') {
      await this.stateManager.transition(userId, BotState.APPOINTMENT_START);
      return this.createResponse(['Escolha outra data.'], BotState.APPOINTMENT_START);
    }

    // Validate time format HH:MM
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = input.match(timeRegex);
    if (!match) {
      return this.createResponse(['Formato de hora inválido. Use HH:MM (ex: 14:30).'], BotState.APPOINTMENT_TIME);
    }

    const timeStr = `${match[1].padStart(2, '0')}:${match[2]}`;

    // Verify availability again (race condition check)
    const state = await this.stateManager.getState(userId);
    const dateStr = state.context.appointmentData?.date;

    if (!dateStr) return this.createResponse(['Erro de estado. Comece novamente.'], BotState.APPOINTMENT_START);

    const slots = await this.schedulingService.getAvailableSlots(this.currentTenantId, dateStr);
    if (!slots.includes(timeStr)) {
      return this.createResponse(['Esse horário não está mais disponível. Escolha outro da lista.', slots.join(', ')], BotState.APPOINTMENT_TIME);
    }

    await this.stateManager.updateContext(userId, {
      appointmentData: { ...state.context.appointmentData, time: timeStr } as any
    });

    // Ask for Name if we don't know it (assuming we might define it in Lead, but let's confirm logic)
    // For now, jump to Confirmation
    await this.stateManager.transition(userId, BotState.APPOINTMENT_CONFIRM);

    return this.createResponse([
      `Confirma agendamento?\n\n📅 Data: ${dateStr}\n⏰ Hora: ${timeStr}\n\nDigite 1 para Sim, 0 para Cancelar.`
    ], BotState.APPOINTMENT_CONFIRM);
  }

  private async handleAppointmentConfirm(userId: string, input: string): Promise<BotResponse> {
    if (input === '1' || input.toLowerCase() === 'sim') {
      const state = await this.stateManager.getState(userId);
      const data = state.context.appointmentData;
      if (!data || !data.date || !data.time) {
        await this.stateManager.transition(userId, BotState.APPOINTMENT_START);
        return this.createResponse(['Dados perdidos. Tente novamente.'], BotState.APPOINTMENT_START);
      }

      try {
        // Fetch user name
        const userRec = await this.database.get<{ name: string }>('SELECT name FROM users WHERE id = ? AND tenant_id = ?', [userId, this.currentTenantId]);

        // Create Appointment
        await this.schedulingService.createAppointment(this.currentTenantId, userId, {
          date: data.date,
          time: data.time,
          name: userRec?.name || 'Cliente',
          phone: userId,
          purpose: 'Atendimento'
        });

        await this.stateManager.transition(userId, BotState.MAIN_MENU);
        await this.stateManager.updateContext(userId, { appointmentData: undefined });

        return this.createResponse(['✅ Agendamento confirmado com sucesso! Enviamos um lembrete antes do horário.'], BotState.MAIN_MENU);

      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('não disponível') || msg.includes('ocupado')) {
          return this.createResponse(['😓 Ops! Parece que esse horário acabou de ser ocupado por outra pessoa.\n\nQue tal verificarmos outros horários disponíveis? Basta me dizer a data novamente.'], BotState.APPOINTMENT_START);
        }
        return this.createResponse(['Erro ao finalizar agendamento: ' + msg], BotState.APPOINTMENT_START);
      }
    }

    await this.stateManager.transition(userId, BotState.MAIN_MENU);
    return this.generateMainMenu(await this.stateManager.getState(userId));
  }


  private formatBusinessHours(): string {
    if (!this.config) return '';
    const h = this.config.businessHours;
    return `Seg-Sex: ${h.weekdays?.start || 'N/A'}-${h.weekdays?.end || 'N/A'}`;
  }

  private createResponse(messages: string[], nextState: BotState): BotResponse { return { messages, nextState }; }

  private async saveOutgoingMessages(userId: string, messages: string[], tenantId?: string, instanceId?: string): Promise<void> {
    for (const msg of messages) { await this.database.saveConversation(userId, 'out', msg, tenantId, instanceId); }
  }
}
