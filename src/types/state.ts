export enum BotState {
  WELCOME = 'WELCOME',
  MAIN_MENU = 'MAIN_MENU',

  // Courses
  COURSES_LIST = 'COURSES_LIST',
  COURSE_DETAIL = 'COURSE_DETAIL',

  // Appointments
  APPOINTMENT_START = 'APPOINTMENT_START',
  APPOINTMENT_DATE = 'APPOINTMENT_DATE',
  APPOINTMENT_TIME = 'APPOINTMENT_TIME',
  APPOINTMENT_NAME = 'APPOINTMENT_NAME',
  APPOINTMENT_PHONE = 'APPOINTMENT_PHONE',
  APPOINTMENT_CONFIRM = 'APPOINTMENT_CONFIRM',
  APPOINTMENT_COMPLETE = 'APPOINTMENT_COMPLETE',
  APPOINTMENT_CANCEL = 'APPOINTMENT_CANCEL',

  // Enrollment
  ENROLLMENT_START = 'ENROLLMENT_START',
  ENROLLMENT_NAME = 'ENROLLMENT_NAME',
  ENROLLMENT_CPF = 'ENROLLMENT_CPF',
  ENROLLMENT_BIRTH = 'ENROLLMENT_BIRTH',
  ENROLLMENT_ADDRESS = 'ENROLLMENT_ADDRESS',
  ENROLLMENT_PHONE = 'ENROLLMENT_PHONE',
  ENROLLMENT_EMAIL = 'ENROLLMENT_EMAIL',
  ENROLLMENT_COURSE = 'ENROLLMENT_COURSE',
  ENROLLMENT_REVIEW = 'ENROLLMENT_REVIEW',
  ENROLLMENT_EDIT = 'ENROLLMENT_EDIT',
  ENROLLMENT_COMPLETE = 'ENROLLMENT_COMPLETE',

  // FAQ
  FAQ_CATEGORIES = 'FAQ_CATEGORIES',
  FAQ_QUESTIONS = 'FAQ_QUESTIONS',
  FAQ_ANSWER = 'FAQ_ANSWER',

  // Human Transfer
  HUMAN_TRANSFER = 'HUMAN_TRANSFER',
  HUMAN_QUEUE = 'HUMAN_QUEUE',
  LEAVE_MESSAGE = 'LEAVE_MESSAGE',

  // Documents
  DOCUMENTS = 'DOCUMENTS',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_REQUEST = 'DOCUMENT_REQUEST',

  // Dynamic Forms
  DYNAMIC_FORM = 'DYNAMIC_FORM',

  // Payments
  PAYMENT_PENDING = 'PAYMENT_PENDING',
}

export interface UserState {
  currentState: BotState;
  previousState: BotState | null;
  data: Record<string, unknown>;
  lastActivity: number;
  context: ConversationContext;
}

export interface ConversationContext {
  enrollmentData?: Partial<EnrollmentData>;
  selectedCourse?: string;
  selectedCategory?: string;
  appointmentData?: Partial<AppointmentData>;
  conversationHistory?: string[];
  currentMenuPath?: string[];
  currentForm?: {
    formId: string;
    currentStep: number;
    data: Record<string, string>;
  };
  currentOrder?: {
    orderId: string;
    amount: number;
    pixCopyPaste: string;
    pixQrCode?: string;
  };
}

export interface EnrollmentData {
  fullName: string;
  cpf: string;
  birthDate: string;
  address: string;
  phone: string;
  email: string;
  courseId: string;
}

export interface AppointmentData {
  name: string;
  phone: string;
  date: string;
  time: string;
  purpose: string;
}

export interface StateTransition {
  nextState: BotState;
  response: string | string[];
  actions?: StateAction[];
}

export interface StateAction {
  type: 'save_data' | 'send_notification' | 'create_appointment' | 'create_enrollment';
  payload: Record<string, unknown>;
}
