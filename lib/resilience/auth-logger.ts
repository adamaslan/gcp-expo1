import * as SecureStore from 'expo-secure-store';

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

const PERSISTED_LOG_KEY = 'auth_error_log_v1';
const MAX_PERSISTED_ENTRIES = 20;

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

  private redactSensitiveData(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.redactSensitiveData(item));

    const redacted: Record<string, unknown> = {};
    for (const key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      if (this.sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactSensitiveData(value);
      } else {
        redacted[key] = value;
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
      metadata: redactedMetadata as Record<string, unknown> | undefined,
      error: error?.message,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(`[${level.toUpperCase()}] ${action}: ${message}`, redactedMetadata);

    if (level === LogLevel.ERROR) {
      this.flushErrorToStore(entry).catch(() => {});
    }
  }

  private async flushErrorToStore(entry: LogEntry): Promise<void> {
    try {
      const raw = await SecureStore.getItemAsync(PERSISTED_LOG_KEY);
      const existing: LogEntry[] = raw ? JSON.parse(raw) : [];
      const updated = [...existing, entry].slice(-MAX_PERSISTED_ENTRIES);
      await SecureStore.setItemAsync(PERSISTED_LOG_KEY, JSON.stringify(updated));
    } catch {
      // Best-effort
    }
  }

  async flushPersistedLogsToBackend(backendUrl: string): Promise<void> {
    try {
      const raw = await SecureStore.getItemAsync(PERSISTED_LOG_KEY);
      if (!raw) return;

      const entries: LogEntry[] = JSON.parse(raw);
      if (entries.length === 0) return;

      await fetch(`${backendUrl}/api/auth-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: entries }),
      });

      await SecureStore.deleteItemAsync(PERSISTED_LOG_KEY);
    } catch {
      // Non-critical — logs stay in store for next startup
    }
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
