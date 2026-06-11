import * as SecureStore from 'expo-secure-store';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  keyPrefix: string;
  persist?: boolean;
  cleanupIntervalMs?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  keyPrefix: 'ratelimit',
  persist: false,
  cleanupIntervalMs: 60 * 1000,
};

function hashIdentifier(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private config: RateLimitConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private loadedKeys: Set<string> = new Set();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  private storeKey(identifier: string): string {
    const hash = hashIdentifier(identifier);
    return `${this.config.keyPrefix}_v1_${hash}`;
  }

  private mapKey(identifier: string): string {
    return `${this.config.keyPrefix}:${identifier}`;
  }

  private async loadPersisted(identifier: string): Promise<void> {
    if (!this.config.persist) return;
    const key = this.storeKey(identifier);
    if (this.loadedKeys.has(key)) return;
    this.loadedKeys.add(key);

    try {
      const raw = await SecureStore.getItemAsync(key);
      if (raw) {
        const timestamps: number[] = JSON.parse(raw);
        const now = Date.now();
        const valid = timestamps.filter(t => now - t < this.config.windowMs);
        if (valid.length > 0) {
          this.attempts.set(this.mapKey(identifier), valid);
        }
      }
    } catch {
      // Treat as empty window on parse failure
    }
  }

  private async persistAttempts(identifier: string, timestamps: number[]): Promise<void> {
    if (!this.config.persist) return;
    const key = this.storeKey(identifier);
    try {
      if (timestamps.length === 0) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await SecureStore.setItemAsync(key, JSON.stringify(timestamps));
      }
    } catch {
      // Best-effort; in-memory state still applies
    }
  }

  private startCleanupTimer(): void {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
      this.cleanupTimer = setInterval(
        () => this.cleanup(),
        this.config.cleanupIntervalMs
      );
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.attempts) {
      const valid = timestamps.filter(t => now - t < this.config.windowMs);
      if (valid.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, valid);
      }
    }
  }

  async isRateLimitedAsync(identifier: string): Promise<boolean> {
    await this.loadPersisted(identifier);
    const mKey = this.mapKey(identifier);
    const now = Date.now();
    let timestamps = (this.attempts.get(mKey) || []).filter(t => now - t < this.config.windowMs);

    if (timestamps.length >= this.config.maxAttempts) {
      this.attempts.set(mKey, timestamps);
      return true;
    }

    timestamps.push(now);
    this.attempts.set(mKey, timestamps);
    await this.persistAttempts(identifier, timestamps);
    return false;
  }

  isRateLimited(identifier: string): boolean {
    const mKey = this.mapKey(identifier);
    const now = Date.now();
    let timestamps = (this.attempts.get(mKey) || []).filter(t => now - t < this.config.windowMs);

    if (timestamps.length >= this.config.maxAttempts) {
      this.attempts.set(mKey, timestamps);
      return true;
    }

    timestamps.push(now);
    this.attempts.set(mKey, timestamps);
    // Persist asynchronously — don't block the sync path
    if (this.config.persist) {
      this.persistAttempts(identifier, timestamps).catch(() => {});
    }
    return false;
  }

  getRemainingAttempts(identifier: string): number {
    const mKey = this.mapKey(identifier);
    const now = Date.now();
    const timestamps = (this.attempts.get(mKey) || []).filter(t => now - t < this.config.windowMs);
    return Math.max(0, this.config.maxAttempts - timestamps.length);
  }

  reset(identifier: string): void {
    const mKey = this.mapKey(identifier);
    this.attempts.delete(mKey);
    if (this.config.persist) {
      SecureStore.deleteItemAsync(this.storeKey(identifier)).catch(() => {});
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.attempts.clear();
  }
}

// Auth limiters use persist:true so a locked-out user can't bypass by restarting.
export const signInLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  keyPrefix: 'signin',
  persist: true,
});

export const signUpLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
  keyPrefix: 'signup',
  persist: true,
});
