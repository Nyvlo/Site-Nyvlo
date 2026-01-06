export interface BotConfig {
  company: CompanyInfo;
  businessHours: BusinessHours;
  bot: BotSettings;
  messages: BotMessages;
  courses: Course[];
  faq: FAQConfig;
  menus?: MenuItem[];
  ai?: AIConfig;
  keywords?: Record<string, string>;
  webhook?: {
    url: string;
    events: string[];
  };
  forms?: Form[];
  payment?: {
    provider: 'asaas' | 'mercadopago' | 'none';
    apiKey?: string;
    isSandbox?: boolean;
  };
}

export interface Form {
  id: string;
  name: string;
  description: string;
  steps: FormStep[];
}

export interface FormStep {
  id: string;
  question: string;
  fieldName: string;
  validationType: 'text' | 'number' | 'email' | 'phone';
  order: number;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'groq' | 'ollama';
  apiKey?: string;
  model: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
}

export interface MenuItem {
  id: string;
  title: string;
  action: string;
  customResponse?: string;
  subItems?: MenuItem[];
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  industryType?: string;
}

export interface BusinessHours {
  weekdays: TimeRange | null;
  saturday: TimeRange | null;
  sunday: TimeRange | null;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface BotSettings {
  sessionTimeout: number;
  maxReconnectAttempts: number;
  messageDelay: number;
  broadcastRateLimit: number;
  catalogLabel?: string;
}

export interface BotMessages {
  welcome: string;
  goodbye: string;
  invalidOption: string;
  outsideHours: string;
  transferToHuman: string;
  noHumanAvailable: string;
  appointmentConfirmation: string;
  appointmentReminder: string;
  enrollmentComplete: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  workload: string;
  prerequisites: string[];
  price: number;
  documents: string[];
  active: boolean;
}

export interface ClassSchedule {
  id: string;
  courseId: string;
  startDate: string;
  endDate: string;
  schedule: string;
  availableSlots: number;
  totalSlots: number;
}

export interface FAQConfig {
  categories: FAQCategory[];
  questions: FAQQuestion[];
}

export interface FAQCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface FAQQuestion {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  keywords: string[];
  order: number;
}
