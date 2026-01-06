import { Router, Response } from 'express';
import { SchedulingService } from '../../services/scheduling-service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export function createSchedulingRoutes(schedulingService: SchedulingService): Router {
    const router = Router();

    // Get Configuration
    router.get('/config', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const config = await schedulingService.getConfig(req.tenantId!);
            res.json({ success: true, config });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar configuração' });
        }
    });

    // Save Configuration
    router.post('/config', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            await schedulingService.saveConfig(req.tenantId!, req.body);
            res.json({ success: true, message: 'Configuração salva' });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao salvar configuração' });
        }
    });

    // Get Available Slots (Public or Private depending on use case, here restricted to logged user/admin for manual panel, AI uses service directly)
    router.get('/slots', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const { date } = req.query;
            if (!date) {
                res.status(400).json({ error: 'Data obrigatória' });
                return;
            }
            const slots = await schedulingService.getAvailableSlots(req.tenantId!, String(date));
            res.json({ success: true, slots });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar slots' });
        }
    });

    // List Appointments
    router.get('/appointments', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const { start, end } = req.query;
            if (!start || !end) {
                // Default: Current Month
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                const appointments = await schedulingService.listAppointments(req.tenantId!, firstDay, lastDay);
                res.json({ success: true, appointments });
                return;
            }
            const appointments = await schedulingService.listAppointments(req.tenantId!, String(start), String(end));
            res.json({ success: true, appointments });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao listar agendamentos' });
        }
    });

    // Create Appointment (Manual)
    router.post('/appointments', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            const { date, time, name, phone, purpose } = req.body;
            if (!date || !time || !name || !phone) {
                res.status(400).json({ error: 'Campos obrigatórios faltando' });
                return;
            }
            const userId = phone.replace(/\D/g, '') + '@s.whatsapp.net'; // Simulated JID
            const result = await schedulingService.createAppointment(req.tenantId!, userId, { date, time, name, phone, purpose });
            res.json({ success: true, appointment: result });
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    });

    // Cancel Appointment
    router.delete('/appointments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
        try {
            await schedulingService.cancelAppointment(req.tenantId!, req.params.id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao cancelar' });
        }
    });

    return router;
}
