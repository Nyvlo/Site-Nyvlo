import { DatabaseService } from './database-service';
import { LogService } from './log-service';
import { v4 as uuidv4 } from 'uuid';

export interface WorkingInterval {
    start: string; // "09:00"
    end: string;   // "12:00"
}

export interface DaySchedule {
    enabled: boolean;
    intervals: WorkingInterval[];
}

export interface SchedulingConfig {
    slotDuration: number; // minutes
    days: {
        monday: DaySchedule;
        tuesday: DaySchedule;
        wednesday: DaySchedule;
        thursday: DaySchedule;
        friday: DaySchedule;
        saturday: DaySchedule;
        sunday: DaySchedule;
    };
}

const DEFAULT_CONFIG: SchedulingConfig = {
    slotDuration: 60,
    days: {
        monday: { enabled: true, intervals: [{ start: '09:00', end: '18:00' }] },
        tuesday: { enabled: true, intervals: [{ start: '09:00', end: '18:00' }] },
        wednesday: { enabled: true, intervals: [{ start: '09:00', end: '18:00' }] },
        thursday: { enabled: true, intervals: [{ start: '09:00', end: '18:00' }] },
        friday: { enabled: true, intervals: [{ start: '09:00', end: '18:00' }] },
        saturday: { enabled: false, intervals: [] },
        sunday: { enabled: false, intervals: [] }
    }
};

export class SchedulingService {
    private io: any = null;

    constructor(
        private database: DatabaseService,
        private logger: LogService
    ) { }

    public setSocketIO(io: any) {
        this.io = io;
    }


    private getDayName(date: Date): keyof SchedulingConfig['days'] {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()] as keyof SchedulingConfig['days'];
    }

    async getConfig(tenantId: string): Promise<SchedulingConfig> {
        const settings = await this.database.get<any>('SELECT business_hours FROM bot_settings WHERE tenant_id = ?', [tenantId]);
        if (!settings || !settings.business_hours) return DEFAULT_CONFIG;
        try {
            const parsed = JSON.parse(settings.business_hours);
            return { ...DEFAULT_CONFIG, ...parsed }; // Merge to ensure safety
        } catch {
            return DEFAULT_CONFIG;
        }
    }

    async saveConfig(tenantId: string, config: SchedulingConfig): Promise<void> {
        const json = JSON.stringify(config);
        // Ensure bot_settings row exists
        await this.database.run(`
            INSERT INTO bot_settings (tenant_id, business_hours) 
            VALUES (?, ?) 
            ON CONFLICT (tenant_id) DO UPDATE SET business_hours = ?
        `, [tenantId, json, json]);
    }

    async getAvailableSlots(tenantId: string, dateStr: string): Promise<string[]> {
        // dateStr format: YYYY-MM-DD
        const config = await this.getConfig(tenantId);
        // Force BRT offset
        const targetDate = new Date(dateStr + 'T00:00:00-03:00');
        const dayName = this.getDayName(targetDate);
        const daySchedule = config.days[dayName];

        if (!daySchedule.enabled || !daySchedule.intervals.length) {
            return [];
        }

        // Get existing appointments for that day
        const startOfDay = new Date(dateStr + 'T00:00:00-03:00').toISOString();
        const endOfDay = new Date(dateStr + 'T23:59:59-03:00').toISOString();

        const appointments = await this.database.all<any>(`
            SELECT scheduled_at, end_at FROM appointments 
            WHERE tenant_id = ? 
            AND status != 'cancelled'
            AND scheduled_at >= ? AND scheduled_at <= ?
        `, [tenantId, startOfDay, endOfDay]);

        const slots: string[] = [];

        for (const interval of daySchedule.intervals) {
            const [startHour, startMin] = interval.start.split(':').map(Number);
            const [endHour, endMin] = interval.end.split(':').map(Number);

            let current = new Date(targetDate);
            current.setHours(startHour, startMin, 0, 0);

            const intervalEnd = new Date(targetDate);
            intervalEnd.setHours(endHour, endMin, 0, 0);

            while (current < intervalEnd) {
                const nextSlot = new Date(current.getTime() + config.slotDuration * 60000);

                if (nextSlot > intervalEnd) break;

                // Check collision
                const isBusy = appointments.some((appt: any) => {
                    const apptStart = new Date(appt.scheduled_at);
                    const apptEnd = appt.end_at ? new Date(appt.end_at) : new Date(apptStart.getTime() + config.slotDuration * 60000);

                    // Basic overlap check
                    return (current < apptEnd && nextSlot > apptStart);
                });

                if (!isBusy) {
                    const systemNow = new Date();
                    if (targetDate.toDateString() !== systemNow.toDateString() || current > systemNow) {
                        try {
                            const formatter = new Intl.DateTimeFormat('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            });
                            slots.push(formatter.format(current));
                        } catch (e) {
                            const h = current.getHours().toString().padStart(2, '0');
                            const m = current.getMinutes().toString().padStart(2, '0');
                            slots.push(`${h}:${m}`);
                        }
                    }
                }

                current = nextSlot;
            }
        }

        return slots;
    }

    async createAppointment(tenantId: string, userId: string, data: { date: string, time: string, name: string, phone: string, purpose?: string }): Promise<any> {
        const config = await this.getConfig(tenantId);
        // Force BRT Timezone (-03:00) to ensure consistency between server and client
        const scheduledAt = new Date(`${data.date}T${data.time}:00-03:00`);
        const endAt = new Date(scheduledAt.getTime() + config.slotDuration * 60000);

        // Double check availability
        const slots = await this.getAvailableSlots(tenantId, data.date);
        if (!slots.includes(data.time)) {
            throw new Error('Horário não disponível');
        }

        const id = `appt_${uuidv4().substring(0, 8)}`;
        const code = uuidv4().substring(0, 6).toUpperCase();

        await this.database.run(`
            INSERT INTO appointments (id, tenant_id, code, user_id, name, phone, scheduled_at, end_at, purpose, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
        `, [id, tenantId, code, userId, data.name, data.phone, scheduledAt.toISOString(), endAt.toISOString(), data.purpose || 'Agendamento Bot']);

        const result = { id, code, scheduledAt, endAt };
        this.io?.to(`tenant:${tenantId}`).emit('appointment_updated', {
            type: 'created',
            appointment: {
                id, tenant_id: tenantId, code, user_id: userId,
                name: data.name, phone: data.phone,
                scheduled_at: scheduledAt.toISOString(),
                end_at: endAt.toISOString(),
                status: 'confirmed', purpose: data.purpose || 'Agendamento Bot'
            }
        });
        return result;
    }

    async listAppointments(tenantId: string, startDate: string, endDate: string): Promise<any[]> {
        return this.database.all(`
            SELECT * FROM appointments 
            WHERE tenant_id = ? 
            AND scheduled_at >= ? AND scheduled_at <= ?
            ORDER BY scheduled_at ASC
        `, [tenantId, startDate + ' 00:00:00', endDate + ' 23:59:59']);
    }

    async cancelAppointment(tenantId: string, appointmentId: string): Promise<void> {
        await this.database.run(`
            UPDATE appointments SET status = 'cancelled' WHERE id = ? AND tenant_id = ?
        `, [appointmentId, tenantId]);
        this.io?.to(`tenant:${tenantId}`).emit('appointment_updated', { type: 'cancelled', id: appointmentId });
    }
}
