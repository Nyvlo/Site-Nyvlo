import { DatabaseService } from './database-service';
import { LogService } from './log-service';
import { AIService } from './ai-service';
import { TenantConfigService } from './tenant-config-service';

export class ServiceEvaluationService {
    private database: DatabaseService;
    private logger: LogService;
    private tenantConfig: TenantConfigService;

    constructor(database: DatabaseService, logger: LogService, tenantConfig: TenantConfigService) {
        this.database = database;
        this.logger = logger;
        this.tenantConfig = tenantConfig;
    }

    /**
     * Avalia uma conversa específica
     */
    async evaluateConversation(tenantId: string, conversationId: string): Promise<boolean> {
        try {
            // 1. Verificar se o módulo está ativo para o tenant
            const tenant = await this.database.get<any>('SELECT module_ai_evaluation FROM tenants WHERE id = ?', [tenantId]);
            if (!tenant?.module_ai_evaluation) {
                this.logger.warn(`Módulo de avaliação de serviço não habilitado para o tenant: ${tenantId}`);
                return false;
            }

            // 2. Buscar dados da conversa
            const conversation = await this.database.get<any>(`
        SELECT c.*, u.id as agent_id, cust.id as customer_id
        FROM web_conversations c
        JOIN web_users u ON c.assigned_agent_id = u.id
        LEFT JOIN web_customers cust ON (c.whatsapp_chat_id = cust.whatsapp_id AND c.tenant_id = cust.tenant_id)
        WHERE c.id = ? AND c.tenant_id = ?
      `, [conversationId, tenantId]);

            if (!conversation) {
                this.logger.error(`Conversa ${conversationId} não encontrada para avaliação`);
                return false;
            }

            // 3. Buscar mensagens da conversa
            const messages = await this.database.all(`
        SELECT sender_name, content, is_from_me, created_at 
        FROM web_messages 
        WHERE conversation_id = ? 
        ORDER BY created_at ASC
      `, [conversationId]);

            if (messages.length === 0) {
                this.logger.warn(`Conversa ${conversationId} sem mensagens para avaliar`);
                return false;
            }

            const conversationContext = messages.map((m: any) =>
                `[${new Date(m.created_at).toLocaleString()}] ${m.is_from_me ? 'ATENDENTE' : 'CLIENTE'}: ${m.content}`
            ).join('\n');

            // 4. Buscar avaliação do cliente (se existir)
            const rating = await this.database.get<any>(`
        SELECT rating FROM web_conversation_ratings 
        WHERE conversation_id = ?
      `, [conversationId]);

            // 5. Instanciar AIService dinamicamente com config do tenant
            const botConfig = await this.tenantConfig.getBotConfig(tenantId);

            if (!botConfig.ai || !botConfig.ai.enabled) {
                this.logger.warn(`IA não configurada/habilitada para o tenant ${tenantId}`);
                return false;
            }

            const aiService = new AIService(botConfig.ai, botConfig, this.logger);

            // 6. Executar Avaliação
            const evaluation = await aiService.evaluateService(conversationContext, rating?.rating);

            // 7. Salvar Avaliação
            await this.database.run(`
        INSERT INTO web_service_evaluations (
          tenant_id, agent_id, conversation_id, customer_id, 
          score_cordiality, score_overall, customer_rating, 
          feedback, improvement_points, comparison_with_customer
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                tenantId,
                conversation.agent_id,
                conversationId,
                conversation.customer_id,
                evaluation.cordialityScore,
                evaluation.overallScore,
                rating?.rating || 0,
                evaluation.feedback,
                evaluation.improvementPoints.join('\n'),
                evaluation.comparison
            ]);

            this.logger.info(`Avaliação de IA concluída para conversa ${conversationId} do tenant ${tenantId}`);
            return true;

        } catch (error) {
            this.logger.error(`Erro ao processar avaliação de serviço`, error as Error);
            return false;
        }
    }

    /**
     * Rotina para avaliar todas as conversas sem avaliação nas últimas 24h
     */
    async runDailyEvaluations(): Promise<void> {
        this.logger.info('Iniciando rotina de avaliação diária de atendimentos...');

        try {
            // Busca todos os tenants com o módulo ativo
            const tenants = await this.database.all<any>('SELECT id FROM tenants WHERE module_ai_evaluation = TRUE');

            for (const tenant of tenants) {
                // Encontra conversas fechadas nas últimas 24h que ainda não foram avaliadas pela IA
                const conversations = await this.database.all<any>(`
          SELECT c.id FROM web_conversations c
          LEFT JOIN web_service_evaluations e ON c.id = e.conversation_id
          WHERE c.tenant_id = ? 
          AND c.status = 'closed'
          AND c.updated_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
          AND e.id IS NULL
          AND c.assigned_agent_id IS NOT NULL
        `, [tenant.id]);

                for (const conv of conversations) {
                    await this.evaluateConversation(tenant.id, conv.id);
                    // Small delay to respect AI rate limits
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        } catch (error) {
            this.logger.error('Erro na rotina diária de avaliação', error as Error);
        }
    }
}
