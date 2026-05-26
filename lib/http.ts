import { monitoring } from './monitoring';
import { withRetry } from './resilience/network-resilience';

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  params?: Record<string, string>;
  token?: string;
  timeoutMs?: number;
}

function resolveUrl(baseUrl: string, path: string, params?: Record<string, string>): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBase);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }
  return url.toString();
}

export async function httpJson<T>(
  baseUrl: string,
  path: string,
  options: HttpOptions = {}
): Promise<T> {
  const { method = 'GET', body, params, token, timeoutMs = 10_000 } = options;
  const url = resolveUrl(baseUrl, path, params);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const metricName = `http:${new URL(url).hostname}:${path}`;
  const start = Date.now();

  try {
    const res = await withRetry(
      () =>
        fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        }),
      {
        maxAttempts: 3,
        shouldRetry: (err) => {
          // Never retry 4xx client errors — only 5xx / network failures.
          // startsWith('HTTP 4') avoids false negatives on 504, port 443 errors, etc.
          if (err.message.startsWith('HTTP 4')) return false;
          return true;
        },
      }
    );

    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      monitoring.recordMetric(metricName, 'failure', Date.now() - start, { status: res.status });
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    if (res.status === 204) {
      monitoring.recordMetric(metricName, 'success', Date.now() - start);
      return {} as T;
    }

    const data = (await res.json()) as T;
    monitoring.recordMetric(metricName, 'success', Date.now() - start);
    return data;
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    monitoring.recordMetric(metricName, isTimeout ? 'timeout' : 'failure', Date.now() - start);
    if (isTimeout) throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    throw err;
  }
}
