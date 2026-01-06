import { BotConfig } from '../types/config';
import { LogService } from './log-service';
import { IndustryTemplateService } from './industry-template-service';

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'groq' | 'ollama';
  apiKey?: string;
  model: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
}

export interface AIResponse {
  message: string;
  action: 'continue' | 'transfer' | 'menu' | 'appointment' | 'enrollment';
  confidence: number;
  intent?: string;
}

export class AIService {
  private config: AIConfig;
  private botConfig: BotConfig;
  private logger: LogService;

  constructor(aiConfig: AIConfig, botConfig: BotConfig, logger: LogService) {
    this.config = aiConfig;
    this.botConfig = botConfig;
    this.logger = logger;
  }

  async processMessage(userMessage: string, conversationHistory: string[] = [], knowledgeContext?: string): Promise<AIResponse> {
    if (!this.config.enabled) {
      return {
        message: 'IA não está habilitada. Use o menu para navegar.',
        action: 'menu',
        confidence: 0
      };
    }

    try {
      // Limita o histórico para evitar tokens excessivos
      const limitedHistory = this.cleanupHistory(conversationHistory);

      const systemPrompt = this.buildSystemPrompt(knowledgeContext);
      const userPrompt = this.buildUserPrompt(userMessage, limitedHistory);

      this.logger.info('Processando mensagem com IA', {
        provider: this.config.provider,
        model: this.config.model,
        historyLength: limitedHistory.length,
        hasKnowledge: !!knowledgeContext
      });

      const response = await this.callAI(systemPrompt, userPrompt);
      const parsedResponse = this.parseAIResponse(response);

      this.logger.info('Resposta da IA processada', {
        action: parsedResponse.action,
        confidence: parsedResponse.confidence
      });

      return parsedResponse;
    } catch (error) {
      this.logger.error('Erro na IA', error as Error);
      return {
        message: 'Desculpe, tive um problema técnico. Vou transferir você para um atendente.',
        action: 'transfer',
        confidence: 0
      };
    }
  }

  private cleanupHistory(history: string[]): string[] {
    // Mantém apenas as últimas 8 mensagens para evitar excesso de tokens
    const maxHistory = 8;
    if (history.length <= maxHistory) {
      return history;
    }

    // Mantém as primeiras 2 e as últimas 6 mensagens
    return [
      ...history.slice(0, 2),
      '... (histórico resumido) ...',
      ...history.slice(-6)
    ];
  }

  private buildSystemPrompt(knowledgeContext?: string): string {
    const company = this.botConfig.company;
    const courses = this.botConfig.courses.filter(c => c.active);
    const faq = this.botConfig.faq;
    const industryType = company.industryType || 'general';

    const template = IndustryTemplateService.getTemplate(industryType);

    let prompt = `Você é ${template.personality} da empresa ${company.name}.
    
INFORMAÇÕES DA EMPRESA:
- Setor: ${template.industry}
- Nome: ${company.name}
- Endereço: ${company.address}
- Telefone: ${company.phone}
- Email: ${company.email}

${template.industry === 'Educação / Cursos' ? 'CURSOS' : 'CATÁLOGO DE SERVIÇOS'}:
${courses.map(c => `- ${c.name}: ${c.description} (R$ ${c.price}, ${c.duration})`).join('\n')}

PERGUNTAS FREQUENTES:
${faq.questions.map(q => `P: ${q.question}\nR: ${q.answer}`).join('\n\n')}
`;

    if (knowledgeContext) {
      prompt += `\nBASE DE CONHECIMENTO ESPECÍFICA (Use estas informações para responder dúvidas técnicas):
${knowledgeContext}
`;
    }

    prompt += `
INSTRUÇÕES ESPECÍFICAS PARA SEU RAMO:
${template.instructions.map((inst: string, i: number) => `${i + 1}. ${inst}`).join('\n')}

INSTRUÇÕES GERAIS:
1. Seja cordial e humano (evite parecer um robô travado)
2. Use emojis moderadamente para deixar a conversa mais amigável
3. Responda de forma clara e objetiva
4. Se não souber algo, use a BASE DE CONHECIMENTO acima. Se ainda assim não souber, seja honesto e ofereça transferir para atendente.
5. Identifique a intenção do usuário e sugira ações apropriadas
6. Para agendamentos, colete: nome, telefone, data preferida
7. Para matrículas, colete: nome, CPF, curso de interesse
8. Se o usuário estiver insatisfeito ou com problema complexo, transfira para atendente

AÇÕES DISPONÍVEIS:
- continue: Continue a conversa normalmente
- transfer: Transferir para atendente humano
- menu: Mostrar menu principal
- appointment: Iniciar processo de agendamento (ex: consultas, reuniões, visitas)
- enrollment: Iniciar processo de matrícula ou contratação direta

FORMATO DE RESPOSTA:
Responda SEMPRE no formato JSON:
{
  "message": "sua resposta aqui",
  "action": "continue|transfer|menu|appointment|enrollment",
  "confidence": 0.8,
  "intent": "descrição da intenção identificada"
}`;
    return prompt;
  }

  private buildUserPrompt(userMessage: string, history: string[]): string {
    let prompt = '';

    if (history.length > 0) {
      prompt += 'HISTÓRICO DA CONVERSA:\n';
      prompt += history.slice(-6).join('\n') + '\n\n';
    }

    prompt += `MENSAGEM ATUAL DO USUÁRIO: ${userMessage}

Analise a mensagem e responda de acordo com as instruções do sistema.`;

    return prompt;
  }

  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(systemPrompt, userPrompt);
      case 'anthropic':
        return this.callAnthropic(systemPrompt, userPrompt);
      case 'groq':
        return this.callGroq(systemPrompt, userPrompt);
      case 'ollama':
        return this.callOllama(systemPrompt, userPrompt);
      default:
        throw new Error(`Provider ${this.config.provider} não suportado`);
    }
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });

    const data = await response.json() as any;
    if (!response.ok) {
      const errorMsg = data.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI API Error: ${errorMsg}`);
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('OpenAI API retornou resposta vazia');
    }

    return data.choices[0].message.content;
  }

  private async callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });

    const data = await response.json() as any;
    if (!response.ok) {
      const errorMsg = data.error?.message || `HTTP ${response.status}`;
      throw new Error(`Groq API Error: ${errorMsg}`);
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Groq API retornou resposta vazia');
    }

    return data.choices[0].message.content;
  }

  private async callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey!,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const data = await response.json() as any;
    if (!response.ok) {
      throw new Error(`Anthropic API Error: ${data.error?.message || 'Unknown error'}`);
    }

    return data.content[0].text;
  }

  private async callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      })
    });

    const data = await response.json() as any;
    if (!response.ok) {
      throw new Error(`Ollama API Error: ${data.error || 'Unknown error'}`);
    }

    return data.message.content;
  }

  async evaluateService(conversationContext: string, customerRating?: number): Promise<{
    cordialityScore: number;
    overallScore: number;
    feedback: string;
    improvementPoints: string[];
    comparison: string;
  }> {
    const systemPrompt = `Você é um Supervisor de Qualidade sênior imparcial. 
Analise a conversa entre um ATENDENTE e um CLIENTE e forneça um feedback detalhado.
Avalie a cordialidade, objetividade e resolução de problemas.

FORMATO DE RESPOSTA JSON:
{
  "cordialityScore": 0-10,
  "overallScore": 0-10,
  "feedback": "Resumo geral do atendimento",
  "improvementPoints": ["Ponto 1", "Ponto 2"],
  "comparison": "Comparação entre a nota da IA e a nota dada pelo cliente (${customerRating || 'não avaliado'})"
}`;

    const userPrompt = `HISTÓRICO DA CONVERSA:\n${conversationContext}\n\nAvalie este atendimento.`;

    try {
      const response = await this.callAI(systemPrompt, userPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Falha ao parsear avaliação da IA');
    } catch (error) {
      this.logger.error('Erro ao avaliar atendimento com IA', error as Error);
      return {
        cordialityScore: 0,
        overallScore: 0,
        feedback: 'Erro ao gerar avaliação automática.',
        improvementPoints: [],
        comparison: 'Indisponível'
      };
    }
  }

  private parseAIResponse(response: string): AIResponse {
    try {
      // Tenta extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          message: parsed.message || response,
          action: parsed.action || 'continue',
          confidence: parsed.confidence || 0.5,
          intent: parsed.intent
        };
      }
    } catch (error) {
      this.logger.warn('Erro ao parsear resposta da IA, usando fallback');
    }

    // Fallback: analisa a resposta de forma simples
    const lowerResponse = response.toLowerCase();
    let action: AIResponse['action'] = 'continue';

    if (lowerResponse.includes('transferir') || lowerResponse.includes('atendente')) {
      action = 'transfer';
    } else if (lowerResponse.includes('agendar') || lowerResponse.includes('visita')) {
      action = 'appointment';
    } else if (lowerResponse.includes('matrícula') || lowerResponse.includes('inscrever')) {
      action = 'enrollment';
    } else if (lowerResponse.includes('menu') || lowerResponse.includes('opções')) {
      action = 'menu';
    }

    return {
      message: response,
      action,
      confidence: 0.3,
      intent: 'fallback_parsing'
    };
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }

  getConfig(): AIConfig {
    return { ...this.config, apiKey: this.config.apiKey ? '***' : undefined };
  }

  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getUsageStats(): { enabled: boolean; provider: string; model: string; hasApiKey: boolean } {
    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      model: this.config.model,
      hasApiKey: !!this.config.apiKey
    };
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    if (!this.config.enabled) {
      return { valid: false, error: 'IA não está habilitada' };
    }

    if (!this.config.apiKey && this.config.provider !== 'ollama') {
      return { valid: false, error: 'API Key não configurada' };
    }

    if (this.config.provider === 'ollama' && !this.config.baseUrl) {
      return { valid: false, error: 'URL base do Ollama não configurada' };
    }

    try {
      // Teste simples de conectividade
      const testResponse = await this.processMessage('teste', []);
      if (testResponse.message) {
        return { valid: true };
      }
      return { valid: false, error: 'Resposta inválida da IA' };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }
}