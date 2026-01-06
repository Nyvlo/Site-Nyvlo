import { LogService } from './log-service';

interface CacheEntry<T> {
  value: T;
  expiry: number;
  hits: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private logger: LogService;
  private defaultTTL: number;

  constructor(logger: LogService, defaultTTLMs: number = 300000) { // 5 minutes default
    this.cache = new Map();
    this.logger = logger;
    this.defaultTTL = defaultTTLMs;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTTL);
    this.cache.set(key, { value, expiry, hits: 0 });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cache cleanup: ${cleaned} entries removed`);
    }
  }

  getStats(): { size: number; hitRate: number; totalHits: number } {
    let totalHits = 0;
    let totalRequests = 0;
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1; // +1 for the initial set
    }
    
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalHits
    };
  }

  // Specific cache methods for common use cases
  cacheUserState(userId: string, state: any, ttlMs: number = 1800000): void { // 30 minutes
    this.set(`user_state:${userId}`, state, ttlMs);
  }

  getUserState(userId: string): any | null {
    return this.get(`user_state:${userId}`);
  }

  cacheAIResponse(prompt: string, response: any, ttlMs: number = 3600000): void { // 1 hour
    const key = `ai_response:${this.hashString(prompt)}`;
    this.set(key, response, ttlMs);
  }

  getAIResponse(prompt: string): any | null {
    const key = `ai_response:${this.hashString(prompt)}`;
    return this.get(key);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}