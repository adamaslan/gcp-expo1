/**
 * API utility for backend communication with proper error handling
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

async function getToken(): Promise<string | null> {
  // In a real app, retrieve from secure storage
  // For now, return null (unauthenticated)
  return null;
}

/**
 * Safe URL resolution that handles path combinations properly
 */
function resolveUrl(path: string, baseUrl: string): URL {
  // Ensure baseUrl ends with / and path doesn't start with /
  // This prevents path from being treated as absolute
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase);
}

export async function fetchBackend<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: Record<string, unknown>;
    params?: Record<string, string>;
  }
): Promise<T> {
  const token = await getToken();
  const url = resolveUrl(path, BACKEND_URL);

  // Add query parameters
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method: options?.method || 'GET',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${body}`);
  }

  // Handle 204 No Content responses (no body to parse)
  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

export async function getMarketData() {
  return fetchBackend('/api/market');
}

export async function getUserProfile() {
  return fetchBackend('/api/user/profile');
}
