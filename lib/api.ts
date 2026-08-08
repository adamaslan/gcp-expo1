// Thin compatibility shim — existing screens import from here unchanged.
// New code should import from lib/clients/gcp3.ts, lib/clients/holdfold.ts,
// or lib/clients/aitext.ts directly.

import { httpJson, type HttpOptions } from './http';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_GCP3_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:8000';

export async function fetchBackend<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: Record<string, unknown>;
    params?: Record<string, string>;
  }
): Promise<T> {
  const httpOptions: HttpOptions = {
    method: options?.method,
    body: options?.body,
    params: options?.params,
  };
  return httpJson<T>(BACKEND_URL, path, httpOptions);
}

export async function getMarketData<T = unknown>() {
  return fetchBackend<T>('/api/market');
}

export async function getUserProfile<T = unknown>() {
  return fetchBackend<T>('/api/user/profile');
}
