import { BotConfig, FAQCategory, FAQQuestion } from '../types/config';

export class FAQService {
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
  }

  getCategories(): FAQCategory[] {
    return this.config.faq.categories.sort((a, b) => a.order - b.order);
  }

  getQuestionsByCategory(categoryId: string): FAQQuestion[] {
    return this.config.faq.questions
      .filter(q => q.categoryId === categoryId)
      .sort((a, b) => a.order - b.order);
  }

  getAnswer(questionId: string): string | null {
    const question = this.config.faq.questions.find(q => q.id === questionId);
    return question?.answer || null;
  }

  getQuestionById(questionId: string): FAQQuestion | null {
    return this.config.faq.questions.find(q => q.id === questionId) || null;
  }

  searchQuestions(query: string): FAQQuestion[] {
    const normalized = query.toLowerCase().trim();
    const words = normalized.split(/\s+/);

    return this.config.faq.questions.filter(q => {
      // Check if any keyword matches
      const keywordMatch = q.keywords.some(k => 
        words.some(w => k.toLowerCase().includes(w) || w.includes(k.toLowerCase()))
      );

      // Check if question text matches
      const questionMatch = words.some(w => 
        q.question.toLowerCase().includes(w)
      );

      return keywordMatch || questionMatch;
    });
  }

  addQuestion(categoryId: string, question: Omit<FAQQuestion, 'id' | 'order'>): FAQQuestion {
    const existingQuestions = this.getQuestionsByCategory(categoryId);
    const maxOrder = existingQuestions.length > 0 
      ? Math.max(...existingQuestions.map(q => q.order)) 
      : 0;

    const newQuestion: FAQQuestion = {
      ...question,
      id: `q${Date.now()}`,
      categoryId,
      order: maxOrder + 1
    };

    this.config.faq.questions.push(newQuestion);
    return newQuestion;
  }

  formatCategoriesList(): string {
    const categories = this.getCategories();
    
    let message = `❓ *Perguntas Frequentes*\n\nSelecione uma categoria:\n\n`;
    
    categories.forEach((cat, index) => {
      message += `${index + 1}. ${cat.icon} ${cat.name}\n`;
    });
    
    message += `\nDigite o número da categoria ou 0 para voltar.`;
    return message;
  }

  formatQuestionsList(categoryId: string): string {
    const category = this.config.faq.categories.find(c => c.id === categoryId);
    const questions = this.getQuestionsByCategory(categoryId);
    
    let message = `${category?.icon} *${category?.name}*\n\n`;
    
    questions.forEach((q, index) => {
      message += `${index + 1}. ${q.question}\n`;
    });
    
    message += `\nDigite o número da pergunta ou 0 para voltar.`;
    return message;
  }

  formatAnswer(question: FAQQuestion): string {
    return `❓ *${question.question}*\n\n${question.answer}\n\n` +
      `━━━━━━━━━━━━━━━\n` +
      `1️⃣ Ver outras perguntas\n` +
      `2️⃣ Falar com atendente\n` +
      `0️⃣ Voltar ao menu principal`;
  }

  formatSearchResults(questions: FAQQuestion[]): string {
    if (questions.length === 0) {
      return `🔍 Não encontrei perguntas relacionadas.\n\n` +
        `Deseja falar com um atendente?\n` +
        `1️⃣ Sim\n` +
        `0️⃣ Voltar ao menu`;
    }

    let message = `🔍 *Perguntas relacionadas:*\n\n`;
    
    questions.slice(0, 5).forEach((q, index) => {
      message += `${index + 1}. ${q.question}\n`;
    });
    
    message += `\nDigite o número da pergunta ou 0 para voltar.`;
    return message;
  }
}
