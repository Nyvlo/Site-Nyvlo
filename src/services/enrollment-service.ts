import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database-service';
import { BotConfig } from '../types/config';
import { Enrollment, EnrollmentStatus } from '../types/database';
import { validateCPF, generateProtocol, formatCPF } from '../utils/validators';

export interface EnrollmentData {
  fullName: string;
  cpf: string;
  birthDate: string;
  address: string;
  phone: string;
  email: string;
  courseId: string;
}

export interface EnrollmentResult {
  success: boolean;
  protocol?: string;
  error?: string;
}

export class EnrollmentService {
  private database: DatabaseService;
  private config: BotConfig;

  constructor(database: DatabaseService, config: BotConfig) {
    this.database = database;
    this.config = config;
  }

  validateCPF(cpf: string): boolean {
    return validateCPF(cpf);
  }

  startEnrollment(userId: string): void {
    // Initialize enrollment session - handled by state manager
  }

  async completeEnrollment(userId: string, data: EnrollmentData): Promise<EnrollmentResult> {
    // Validate CPF
    if (!this.validateCPF(data.cpf)) {
      return { success: false, error: 'CPF inválido' };
    }

    // Check if CPF already has pending enrollment
    const existing = await this.getByUserCPF(data.cpf);
    if (existing && existing.status === 'pending') {
      return {
        success: false,
        error: `Já existe uma pré-matrícula pendente para este CPF. Protocolo: ${existing.protocol}`
      };
    }

    const id = uuidv4();
    const protocol = generateProtocol();

    try {
      await this.database.run(`
        INSERT INTO enrollments (
          id, protocol, user_id, full_name, cpf, birth_date, 
          address, phone, email, course_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [
        id, protocol, userId, data.fullName, data.cpf, data.birthDate,
        data.address, data.phone, data.email, data.courseId
      ]);

      return { success: true, protocol };
    } catch (error) {
      return { success: false, error: 'Erro ao salvar pré-matrícula' };
    }
  }

  async getByProtocol(protocol: string): Promise<Enrollment | null> {
    const row = await this.database.get<any>(`
      SELECT * FROM enrollments WHERE protocol = ?
    `, [protocol]);

    if (!row) return null;

    return this.mapRowToEnrollment(row);
  }

  async getByUserCPF(cpf: string): Promise<Enrollment | null> {
    const cleanCPF = cpf.replace(/\D/g, '');

    const row = await this.database.get<any>(`
      SELECT * FROM enrollments WHERE cpf = ? ORDER BY created_at DESC LIMIT 1
    `, [cleanCPF]);

    if (!row) return null;

    return this.mapRowToEnrollment(row);
  }

  async updateEnrollmentStatus(protocol: string, status: EnrollmentStatus): Promise<boolean> {
    const result = await this.database.run(`
      UPDATE enrollments SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE protocol = ?
    `, [status, protocol]);

    return result.changes > 0;
  }

  formatReviewMessage(data: Partial<EnrollmentData>): string {
    const course = this.config.courses.find(c => c.id === data.courseId);

    let message = `📋 *Revisão dos Dados*\n\n`;
    message += `👤 *Nome:* ${data.fullName || '-'}\n`;
    message += `🆔 *CPF:* ${data.cpf ? formatCPF(data.cpf) : '-'}\n`;
    message += `🎂 *Data de Nascimento:* ${data.birthDate || '-'}\n`;
    message += `📍 *Endereço:* ${data.address || '-'}\n`;
    message += `📱 *Telefone:* ${data.phone || '-'}\n`;
    message += `📧 *E-mail:* ${data.email || '-'}\n`;
    message += `📚 *Curso:* ${course?.name || '-'}\n\n`;
    message += `Os dados estão corretos?\n`;
    message += `1️⃣ Sim, confirmar pré-matrícula\n`;
    message += `2️⃣ Não, corrigir dados\n`;
    message += `0️⃣ Cancelar`;

    return message;
  }

  formatCompletionMessage(protocol: string): string {
    return this.config.messages.enrollmentComplete
      .replace('{protocolo}', protocol);
  }

  formatEditOptions(): string {
    return `Qual dado deseja corrigir?\n\n` +
      `1️⃣ Nome\n` +
      `2️⃣ CPF\n` +
      `3️⃣ Data de Nascimento\n` +
      `4️⃣ Endereço\n` +
      `5️⃣ Telefone\n` +
      `6️⃣ E-mail\n` +
      `7️⃣ Curso\n` +
      `0️⃣ Voltar para revisão`;
  }

  getEnrollmentFields(): string[] {
    return ['fullName', 'cpf', 'birthDate', 'address', 'phone', 'email', 'courseId'];
  }

  getFieldPrompt(field: string): string {
    const prompts: Record<string, string> = {
      fullName: '👤 Digite seu *nome completo*:',
      cpf: '🆔 Digite seu *CPF* (apenas números):',
      birthDate: '🎂 Digite sua *data de nascimento* (DD/MM/AAAA):',
      address: '📍 Digite seu *endereço completo*:',
      phone: '📱 Digite seu *telefone* com DDD:',
      email: '📧 Digite seu *e-mail*:',
      courseId: '📚 Selecione o *curso* desejado:'
    };
    return prompts[field] || 'Digite o valor:';
  }

  private mapRowToEnrollment(row: any): Enrollment {
    return {
      id: row.id,
      protocol: row.protocol,
      userId: row.user_id,
      fullName: row.full_name,
      cpf: row.cpf,
      birthDate: row.birth_date,
      address: row.address,
      phone: row.phone,
      email: row.email,
      courseId: row.course_id,
      status: row.status as EnrollmentStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
