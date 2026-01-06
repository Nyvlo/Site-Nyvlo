import { DatabaseService } from './database-service';
import { LogService } from './log-service';

export interface AuditLogEntry {
    tenantId: string;
    userId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditService {
    constructor(
        private db: DatabaseService,
        private logger: LogService
    ) { }

    /**
     * Registra uma ação na tabela de auditoria
     */
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            await this.db.run(`
        INSERT INTO audit_logs (
          tenant_id, user_id, action, entity, entity_id, details, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                entry.tenantId,
                entry.userId || null,
                entry.action,
                entry.entity || null,
                entry.entityId || null,
                entry.details ? JSON.stringify(entry.details) : null,
                entry.ipAddress || null,
                entry.userAgent || null
            ]);
        } catch (error) {
            // Falha silenciosa no log de auditoria para não parar o fluxo principal,
            // mas registramos no log do sistema.
            this.logger.error('Falha ao registrar log de auditoria', error as Error);
        }
    }

    /**
     * Busca logs de auditoria de um tenant
     */
    async getLogs(tenantId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
        return this.db.query(`
      SELECT 
        al.*, 
        u.name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN web_users u ON al.user_id = u.id
      WHERE al.tenant_id = ?
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [tenantId, limit, offset]);
    }
}
