import { LogService } from './log-service';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private blocked: Map<string, number>;
  private logger: LogService;
  private config: RateLimitConfig;

  constructor(logger: LogService, config: RateLimitConfig) {
    this.limits = new Map();
    this.blocked = new Map();
    this.logger = logger;
    this.config = config;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();

    // Check if blocked
    const blockUntil = this.blocked.get(identifier);
    if (blockUntil && now < blockUntil) {
      return false;
    }

    // Remove from blocked list if time has passed
    if (blockUntil && now >= blockUntil) {
      this.blocked.delete(identifier);
    }

    const entry = this.limits.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      // Rate limit exceeded
      if (this.config.blockDurationMs) {
        this.blocked.set(identifier, now + this.config.blockDurationMs);
        this.logger.warn(`Rate limit exceeded for ${identifier}, blocked for ${this.config.blockDurationMs}ms`);
      }
      return false;
    }

    // Increment counter
    entry.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.config.windowMs;
    }
    return entry.resetTime;
  }

  isBlocked(identifier: string): boolean {
    const blockUntil = this.blocked.get(identifier);
    return blockUntil ? Date.now() < blockUntil : false;
  }

  unblock(identifier: string): void {
    this.blocked.delete(identifier);
    this.logger.info(`Unblocked ${identifier}`);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean expired rate limit entries
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    // Clean expired blocks
    for (const [key, blockUntil] of this.blocked.entries()) {
      if (now >= blockUntil) {
        this.blocked.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Rate limiter cleanup: ${cleaned} entries removed`);
    }
  }

  getStats(): { 
    activeUsers: number; 
    blockedUsers: number; 
    totalRequests: number;
  } {
    let totalRequests = 0;
    for (const entry of this.limits.values()) {
      totalRequests += entry.count;
    }

    return {
      activeUsers: this.limits.size,
      blockedUsers: this.blocked.size,
      totalRequests
    };
  }
}