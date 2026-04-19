interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  keyPrefix: string;
  cleanupIntervalMs?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  keyPrefix: "ratelimit",
  cleanupIntervalMs: 60 * 1000, // cleanup every minute
};

class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private config: RateLimitConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
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
      const validTimestamps = timestamps.filter(t => now - t < this.config.windowMs);
      if (validTimestamps.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validTimestamps);
      }
    }
  }

  isRateLimited(identifier: string): boolean {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    let timestamps = this.attempts.get(key) || [];

    // Remove expired timestamps (sliding window)
    timestamps = timestamps.filter(t => now - t < this.config.windowMs);

    if (timestamps.length >= this.config.maxAttempts) {
      this.attempts.set(key, timestamps);
      return true;
    }

    timestamps.push(now);
    this.attempts.set(key, timestamps);
    return false;
  }

  getRemainingAttempts(identifier: string): number {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    let timestamps = this.attempts.get(key) || [];

    timestamps = timestamps.filter(t => now - t < this.config.windowMs);
    return Math.max(0, this.config.maxAttempts - timestamps.length);
  }

  reset(identifier: string): void {
    const key = `${this.config.keyPrefix}:${identifier}`;
    this.attempts.delete(key);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.attempts.clear();
  }
}

export const signInLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  keyPrefix: "signin",
});

export const signUpLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
  keyPrefix: "signup",
});
