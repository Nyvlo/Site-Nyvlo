import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: unknown;
}

export class LogService {
  private logDir: string;
  private currentLogFile: string;

  constructor(logDir: string = 'logs') {
    this.logDir = logDir;
    this.ensureLogDir();
    this.currentLogFile = this.getLogFileName();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `bot-${date}.log`);
  }

  private formatEntry(level: LogLevel, message: string, details?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
  }

  private write(entry: LogEntry): void {
    const logFile = this.getLogFileName();
    const line = JSON.stringify(entry) + '\n';
    
    fs.appendFileSync(logFile, line);
    
    // Console output
    const color = this.getColor(entry.level);
    console.log(`${color}[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}\x1b[0m`);
    if (entry.details) {
      console.log(entry.details);
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'error': return '\x1b[31m';
      case 'warn': return '\x1b[33m';
      case 'info': return '\x1b[36m';
      case 'debug': return '\x1b[90m';
      default: return '\x1b[0m';
    }
  }

  info(message: string, details?: unknown): void {
    this.write(this.formatEntry('info', message, details));
  }

  warn(message: string, details?: unknown): void {
    this.write(this.formatEntry('warn', message, details));
  }

  error(message: string, error?: Error | unknown): void {
    const details = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    this.write(this.formatEntry('error', message, details));
  }

  debug(message: string, details?: unknown): void {
    this.write(this.formatEntry('debug', message, details));
  }
}
