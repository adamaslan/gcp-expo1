interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  keyPrefix: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  keyPrefix: "ratelimit",
};

class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  isRateLimited(identifier: string): boolean {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const record = this.attempts.get(key);
    const now = Date.now();

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return false;
    }

    record.count++;
    return record.count > this.config.maxAttempts;
  }

  getRemainingAttempts(identifier: string): number {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const record = this.attempts.get(key);

    if (!record) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - record.count);
  }

  reset(identifier: string): void {
    const key = `${this.config.keyPrefix}:${identifier}`;
    this.attempts.delete(key);
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
