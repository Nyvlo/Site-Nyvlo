import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DatabaseService } from './database-service';
import { LogService } from './log-service';

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  maxBackups: number;
  backupPath: string;
}

export class BackupService {
  private database: DatabaseService;
  private logger: LogService;
  private config: BackupConfig;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(database: DatabaseService, logger: LogService, config: BackupConfig) {
    this.database = database;
    this.logger = logger;
    this.config = config;

    if (!fs.existsSync(this.config.backupPath)) {
      fs.mkdirSync(this.config.backupPath, { recursive: true });
    }
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Backup automático desabilitado');
      return;
    }

    this.logger.info(`Backup automático habilitado (intervalo: ${this.config.intervalHours}h)`);

    // Agendar backups
    this.intervalId = setInterval(() => {
      this.createBackup().catch(err => this.logger.error('Erro no backup agendado', err));
    }, this.config.intervalHours * 60 * 60 * 1000);

    // Executar primeiro backup após 1 minuto de boot (opcional)
    setTimeout(() => this.createBackup(), 60000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info('Backup automático parado');
    }
  }

  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.sql`;
    const fullPath = path.join(this.config.backupPath, fileName);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.startsWith('postgres')) {
      this.logger.warn('DATABASE_URL não configurada ou não é Postgres. Backup via pg_dump ignorado.');
      return '';
    }

    try {
      this.logger.info(`Iniciando backup para: ${fileName}...`);
      // Requer que pg_dump esteja instalado no host/container
      await execAsync(`pg_dump "${dbUrl}" > "${fullPath}"`);
      this.logger.info(`Backup concluído com sucesso: ${fullPath}`);

      await this.cleanupOldBackups();
      return fullPath;
    } catch (error) {
      this.logger.error('Falha ao executar pg_dump', error as Error);
      return '';
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.backupPath)
        .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
        .map(f => ({
          name: f,
          path: path.join(this.config.backupPath, f),
          mtime: fs.statSync(path.join(this.config.backupPath, f)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (files.length > this.config.maxBackups) {
        const toDelete = files.slice(this.config.maxBackups);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
          this.logger.info(`Backup antigo removido: ${file.name}`);
        }
      }
    } catch (error) {
      this.logger.error('Erro ao limpar backups antigos', error as Error);
    }
  }

  getBackupList(): Array<{ name: string; size: number; created: Date }> {
    if (!fs.existsSync(this.config.backupPath)) return [];

    return fs.readdirSync(this.config.backupPath)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const stats = fs.statSync(path.join(this.config.backupPath, f));
        return {
          name: f,
          size: stats.size,
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  async restoreBackup(backupFileName: string): Promise<void> {
    const fullPath = path.join(this.config.backupPath, backupFileName);
    const dbUrl = process.env.DATABASE_URL;

    if (!fs.existsSync(fullPath)) throw new Error('Arquivo de backup não encontrado');
    if (!dbUrl) throw new Error('DATABASE_URL não configurada');

    this.logger.info(`Iniciando restauração de backup: ${backupFileName}...`);
    try {
      // ATENÇÃO: psql --clean pode ser destrutivo.
      await execAsync(`psql "${dbUrl}" < "${fullPath}"`);
      this.logger.info('Restauração concluída com sucesso');
    } catch (error) {
      this.logger.error('Falha ao restaurar backup', error as Error);
      throw error;
    }
  }
}