enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

class AuthLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private sensitiveFields = [
    'token',
    'secret',
    'password',
    'credential',
    'key',
    'api_key',
    'apiKey',
    'auth',
    'authorization',
    'jwt',
    'oauth',
    'session_id',
    'sessionId',
    'refresh_token',
    'refreshToken',
    'private_key',
    'privateKey',
  ];

  private redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
    const redacted = { ...obj };
    for (const field of this.sensitiveFields) {
      for (const key in redacted) {
        if (key.toLowerCase().includes(field.toLowerCase())) {
          redacted[key] = '[REDACTED]';
        }
      }
    }
    return redacted;
  }

  private log(level: LogLevel, action: string, message: string, metadata?: Record<string, unknown>, error?: Error) {
    const redactedMetadata = metadata ? this.redactSensitiveData(metadata) : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      action,
      message,
      metadata: redactedMetadata,
      error: error?.message,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(`[${level.toUpperCase()}] ${action}: ${message}`, redactedMetadata);
  }

  debug(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, action, message, metadata);
  }

  info(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.INFO, action, message, metadata);
  }

  warn(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.WARN, action, message, metadata);
  }

  error(action: string, message: string, error?: Error, metadata?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, action, message, metadata, error);
  }

  getLogs(filter?: { level?: LogLevel; action?: string }): LogEntry[] {
    return this.logs.filter((log) => {
      if (filter?.level && log.level !== filter.level) return false;
      if (filter?.action && log.action !== filter.action) return false;
      return true;
    });
  }
}

export const authLogger = new AuthLogger();
