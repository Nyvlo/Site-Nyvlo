import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database-service';
import { BotConfig } from '../types/config';
import { Appointment, AppointmentStatus } from '../types/database';
import { generateAppointmentCode } from '../utils/validators';

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

export interface AppointmentData {
  userId: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  purpose: string;
}

export class AppointmentService {
  private database: DatabaseService;
  private config: BotConfig;

  constructor(database: DatabaseService, config: BotConfig) {
    this.database = database;
    this.config = config;
  }

  async getAvailableSlots(startDate: Date, endDate: Date): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      let hours: { start: string; end: string } | null = null;

      if (dayOfWeek === 0) {
        hours = this.config.businessHours.sunday;
      } else if (dayOfWeek === 6) {
        hours = this.config.businessHours.saturday;
      } else {
        hours = this.config.businessHours.weekdays;
      }

      if (hours) {
        const startHour = parseInt(hours.start.split(':')[0]);
        const endHour = parseInt(hours.end.split(':')[0]);

        for (let hour = startHour; hour < endHour; hour += 2) {
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          const dateStr = this.formatDate(current);

          // Check if slot is already booked
          const isBooked = await this.isSlotBooked(dateStr, timeStr);

          slots.push({
            date: dateStr,
            time: timeStr,
            available: !isBooked
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots.filter(s => s.available);
  }

  private async isSlotBooked(date: string, time: string): Promise<boolean> {
    const scheduledAt = `${date} ${time}`;

    const result = await this.database.get<{ count: number | string }>(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE scheduled_at LIKE ? AND status != 'cancelled'
    `, [`${scheduledAt}%`]);

    return Number(result?.count || 0) > 0;
  }

  async createAppointment(data: AppointmentData): Promise<Appointment> {
    const id = uuidv4();
    const code = generateAppointmentCode();
    const scheduledAt = `${data.date} ${data.time}`;

    await this.database.run(`
      INSERT INTO appointments (id, code, user_id, name, phone, scheduled_at, purpose, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [id, code, data.userId, data.name, data.phone, scheduledAt, data.purpose]);

    return {
      id,
      code,
      userId: data.userId,
      name: data.name,
      phone: data.phone,
      scheduledAt: new Date(scheduledAt),
      purpose: data.purpose,
      status: 'pending',
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async cancelAppointment(code: string): Promise<boolean> {
    const result = await this.database.run(`
      UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE code = ? AND status != 'cancelled'
    `, [code]);

    return result.changes > 0;
  }

  async rescheduleAppointment(code: string, newDate: string, newTime: string): Promise<Appointment | null> {
    const scheduledAt = `${newDate} ${newTime}`;

    const result = await this.database.run(`
      UPDATE appointments SET scheduled_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE code = ? AND status != 'cancelled'
    `, [scheduledAt, code]);

    if (result.changes === 0) return null;

    return this.getByCode(code);
  }

  async getByCode(code: string): Promise<Appointment | null> {
    const row = await this.database.get<any>(`
      SELECT * FROM appointments WHERE code = ?
    `, [code]);

    if (!row) return null;

    return this.mapRowToAppointment(row);
  }

  async getPendingReminders(): Promise<Appointment[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.formatDate(tomorrow);

    const rows = await this.database.query<any>(`
      SELECT * FROM appointments 
      WHERE scheduled_at LIKE ? 
      AND status = 'pending' 
      AND reminder_sent = 0
    `, [`${tomorrowStr}%`]);

    return rows.map(row => this.mapRowToAppointment(row));
  }

  async markReminderSent(id: string): Promise<void> {
    await this.database.run(`
      UPDATE appointments SET reminder_sent = 1 WHERE id = ?
    `, [id]);
  }

  formatAvailableSlots(slots: TimeSlot[]): string {
    if (slots.length === 0) {
      return `😔 Não há horários disponíveis no momento.\n\nDeseja entrar na lista de espera?\n1️⃣ Sim\n0️⃣ Voltar ao menu`;
    }

    let message = `📅 *Horários Disponíveis*\n\n`;

    // Group by date
    const byDate: Record<string, TimeSlot[]> = {};
    slots.forEach(slot => {
      if (!byDate[slot.date]) byDate[slot.date] = [];
      byDate[slot.date].push(slot);
    });

    let index = 1;
    Object.entries(byDate).forEach(([date, dateSlots]) => {
      message += `📆 *${date}*\n`;
      dateSlots.forEach(slot => {
        message += `${index}. ${slot.time}\n`;
        index++;
      });
      message += '\n';
    });

    message += `Digite o número do horário desejado ou 0 para voltar.`;
    return message;
  }

  formatConfirmation(appointment: Appointment): string {
    return this.config.messages.appointmentConfirmation
      .replace('{data}', this.formatDate(appointment.scheduledAt))
      .replace('{horario}', appointment.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .replace('{endereco}', this.config.company.address)
      .replace('{codigo}', appointment.code);
  }

  formatReminder(appointment: Appointment): string {
    return this.config.messages.appointmentReminder
      .replace('{data}', this.formatDate(appointment.scheduledAt))
      .replace('{horario}', appointment.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .replace('{endereco}', this.config.company.address);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }

  private mapRowToAppointment(row: any): Appointment {
    return {
      id: row.id,
      code: row.code,
      userId: row.user_id,
      name: row.name,
      phone: row.phone,
      scheduledAt: new Date(row.scheduled_at),
      purpose: row.purpose,
      status: row.status as AppointmentStatus,
      reminderSent: Boolean(row.reminder_sent),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
