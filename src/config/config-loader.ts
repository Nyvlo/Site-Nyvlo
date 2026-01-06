import * as fs from 'fs';
import * as path from 'path';
import { BotConfig } from '../types/config';

const DEFAULT_CONFIG: BotConfig = {
  company: {
    name: 'Modus Centro de Formação de Vigilantes',
    address: 'Rua Exemplo, 123 - Centro - Cidade/UF',
    phone: '(00) 0000-0000',
    email: 'contato@modus.com.br',
    website: 'www.modus.com.br'
  },
  businessHours: {
    weekdays: { start: '08:00', end: '18:00' },
    saturday: { start: '08:00', end: '12:00' },
    sunday: null
  },
  bot: {
    sessionTimeout: 30,
    maxReconnectAttempts: 5,
    messageDelay: 1000,
    broadcastRateLimit: 30
  },
  ai: {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    maxTokens: 500,
    temperature: 0.7,
    enabled: false
  },
  messages: {
    welcome: '👋 Olá! Bem-vindo à *{empresa}*!\n\nSou o assistente virtual e estou aqui para ajudá-lo.',
    goodbye: 'Obrigado pelo contato! Até logo! 👋',
    invalidOption: '❌ Opção inválida. Por favor, escolha uma das opções disponíveis.',
    outsideHours: '⏰ Nosso horário de atendimento é:\n{horario}\n\nDeixe sua mensagem que retornaremos assim que possível.',
    transferToHuman: '👤 Aguarde um momento, vou transferir você para um de nossos atendentes...',
    noHumanAvailable: '😔 No momento não há atendentes disponíveis. Por favor, deixe sua mensagem.',
    appointmentConfirmation: '✅ Agendamento confirmado!\n\n📅 Data: {data}\n⏰ Horário: {horario}\n📍 Local: {endereco}\n\nCódigo: {codigo}',
    appointmentReminder: '🔔 Lembrete: Você tem um agendamento amanhã!\n\n📅 Data: {data}\n⏰ Horário: {horario}\n📍 Local: {endereco}',
    enrollmentComplete: '✅ Pré-matrícula realizada com sucesso!\n\nSeu protocolo é: *{protocolo}*\n\nGuarde este número para acompanhamento.'
  },
  courses: [
    {
      id: 'vigilante',
      name: 'Formação de Vigilante',
      description: 'Curso completo para formação de vigilante patrimonial',
      duration: '3 meses',
      workload: '200 horas',
      prerequisites: [
        'Idade mínima de 21 anos',
        'Ensino fundamental completo',
        'Não possuir antecedentes criminais',
        'Aptidão física e mental'
      ],
      price: 1500.00,
      documents: [
        'RG e CPF',
        'Comprovante de residência',
        'Certidão de antecedentes criminais',
        'Certificado de escolaridade',
        '2 fotos 3x4'
      ],
      active: true
    },
    {
      id: 'reciclagem',
      name: 'Reciclagem de Vigilante',
      description: 'Curso de atualização obrigatória para vigilantes',
      duration: '1 mês',
      workload: '40 horas',
      prerequisites: [
        'Possuir CNV válida ou vencida há menos de 2 anos',
        'Certificado do curso de formação'
      ],
      price: 400.00,
      documents: [
        'RG e CPF',
        'CNV (Carteira Nacional de Vigilante)',
        'Certificado do curso de formação'
      ],
      active: true
    },
    {
      id: 'extensao-armada',
      name: 'Extensão em Vigilância Armada',
      description: 'Habilitação para porte de arma de fogo em serviço',
      duration: '1 mês',
      workload: '60 horas',
      prerequisites: [
        'Possuir CNV válida',
        'Aprovação em exame psicológico específico'
      ],
      price: 800.00,
      documents: [
        'RG e CPF',
        'CNV válida',
        'Laudo psicológico para porte de arma'
      ],
      active: true
    }
  ],
  faq: {
    categories: [
      { id: 'cursos', name: 'Sobre os Cursos', icon: '📚', order: 1 },
      { id: 'matricula', name: 'Matrícula e Pagamento', icon: '💳', order: 2 },
      { id: 'documentos', name: 'Documentação', icon: '📄', order: 3 },
      { id: 'certificacao', name: 'Certificação e CNV', icon: '🎓', order: 4 }
    ],
    questions: [
      {
        id: 'q1',
        categoryId: 'cursos',
        question: 'Quanto tempo dura o curso de formação?',
        answer: 'O curso de Formação de Vigilante tem duração de 3 meses, com carga horária de 200 horas, incluindo aulas teóricas e práticas.',
        keywords: ['duração', 'tempo', 'quanto tempo', 'meses'],
        order: 1
      },
      {
        id: 'q2',
        categoryId: 'cursos',
        question: 'Quais são os requisitos para fazer o curso?',
        answer: 'Os requisitos são:\n• Idade mínima de 21 anos\n• Ensino fundamental completo\n• Não possuir antecedentes criminais\n• Aptidão física e mental comprovada',
        keywords: ['requisitos', 'precisa', 'necessário', 'exigências'],
        order: 2
      },
      {
        id: 'q3',
        categoryId: 'matricula',
        question: 'Quais as formas de pagamento?',
        answer: 'Aceitamos:\n• Cartão de crédito (até 12x)\n• Boleto bancário\n• PIX\n• Dinheiro\n\nConsulte condições especiais para pagamento à vista.',
        keywords: ['pagamento', 'pagar', 'parcela', 'cartão', 'boleto'],
        order: 1
      },
      {
        id: 'q4',
        categoryId: 'documentos',
        question: 'Quais documentos preciso para matrícula?',
        answer: 'Documentos necessários:\n• RG e CPF\n• Comprovante de residência\n• Certidão de antecedentes criminais\n• Certificado de escolaridade\n• 2 fotos 3x4',
        keywords: ['documentos', 'papéis', 'matrícula', 'preciso levar'],
        order: 1
      },
      {
        id: 'q5',
        categoryId: 'certificacao',
        question: 'Como funciona a emissão da CNV?',
        answer: 'Após a conclusão do curso, encaminhamos toda documentação à Polícia Federal para emissão da CNV (Carteira Nacional de Vigilante). O prazo médio é de 30 a 60 dias.',
        keywords: ['CNV', 'carteira', 'certificado', 'polícia federal'],
        order: 1
      }
    ]
  }
};

export class ConfigLoader {
  private static configPath = 'config/bot-config.json';

  static load(): BotConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const userConfig = JSON.parse(fileContent);
        const merged = this.mergeConfig(DEFAULT_CONFIG, userConfig);

        // Sobrescrever com variáveis de ambiente se existirem
        if (process.env.GROQ_API_KEY && merged.ai) {
          merged.ai.apiKey = process.env.GROQ_API_KEY;
        }

        return merged;
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração, usando padrão:', error);
    }

    // Create default config file if it doesn't exist
    this.save(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  static save(config: BotConfig): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  static reload(): BotConfig {
    return this.load();
  }

  private static mergeConfig(defaultConfig: BotConfig, userConfig: Partial<BotConfig>): BotConfig {
    return {
      company: { ...defaultConfig.company, ...userConfig.company },
      businessHours: { ...defaultConfig.businessHours, ...userConfig.businessHours },
      bot: { ...defaultConfig.bot, ...userConfig.bot },
      ai: userConfig.ai ? { ...defaultConfig.ai, ...userConfig.ai } : defaultConfig.ai,
      messages: { ...defaultConfig.messages, ...userConfig.messages },
      courses: userConfig.courses || defaultConfig.courses,
      faq: userConfig.faq || defaultConfig.faq,
      menus: userConfig.menus || defaultConfig.menus
    };
  }

  static validate(config: BotConfig): string[] {
    const errors: string[] = [];

    if (!config.company.name) {
      errors.push('Nome da empresa é obrigatório');
    }

    if (!config.businessHours.weekdays) {
      errors.push('Horário de funcionamento em dias úteis é obrigatório');
    }

    if (config.bot.sessionTimeout < 1) {
      errors.push('Timeout de sessão deve ser maior que 0');
    }

    if (config.bot.maxReconnectAttempts < 1) {
      errors.push('Número máximo de tentativas de reconexão deve ser maior que 0');
    }

    return errors;
  }
}
