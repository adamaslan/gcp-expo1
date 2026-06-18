/**
 * Schwab integration health helpers.
 * Wraps the brokerage link status so screens get a typed, cacheable object
 * rather than raw API responses.
 *
 * Token refresh is handled server-side (schwab-nu1); this module detects
 * expired or broken links so the app can surface a reconnect CTA.
 */

export type SchwabLinkStatus =
  | 'connected'     // token valid, data flowing
  | 'expiring_soon' // <24 h until token expiry — trigger silent refresh
  | 'expired'       // token expired — user must re-auth
  | 'disconnected'  // never linked or user removed the connection
  | 'error';        // unknown backend error

export interface SchwabHealth {
  status: SchwabLinkStatus;
  /** ISO timestamp of last successful data pull */
  lastSyncAt?: string;
  /** ISO timestamp of token expiry */
  tokenExpiresAt?: string;
  /** Human-readable reason for non-connected status */
  message?: string;
}

const SCHWAB_BACKEND =
  process.env.EXPO_PUBLIC_GCP3_BACKEND_URL ?? 'http://localhost:8000';

const EXPIRY_WARN_SECONDS = 60 * 60 * 24; // 24 h

export async function fetchSchwabHealth(authToken: string): Promise<SchwabHealth> {
  let res: Response;
  try {
    res = await fetch(`${SCHWAB_BACKEND}/api/schwab/health`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  } catch {
    return { status: 'error', message: 'Network error — check your connection.' };
  }

  if (res.status === 401) return { status: 'expired', message: 'Session expired — please reconnect your Schwab account.' };
  if (res.status === 404) return { status: 'disconnected', message: 'No Schwab account linked.' };
  if (!res.ok) return { status: 'error', message: `Backend error ${res.status}` };

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    return { status: 'error', message: 'Invalid response from server.' };
  }

  const expiresAt = typeof data.token_expires_at === 'string' ? data.token_expires_at : undefined;
  const lastSyncAt = typeof data.last_sync_at === 'string' ? data.last_sync_at : undefined;

  if (expiresAt) {
    const expiryMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiryMs)) {
      // Unparseable date — treat as error rather than silently claiming connected.
      return { status: 'error', message: 'Could not parse token expiry date.' };
    }
    const secondsLeft = (expiryMs - Date.now()) / 1000;
    if (secondsLeft <= 0) return { status: 'expired', tokenExpiresAt: expiresAt, lastSyncAt };
    if (secondsLeft < EXPIRY_WARN_SECONDS) return { status: 'expiring_soon', tokenExpiresAt: expiresAt, lastSyncAt };
  }

  return { status: 'connected', tokenExpiresAt: expiresAt, lastSyncAt };
}

/** Trigger server-side proactive token refresh before expiry. */
export async function requestTokenRefresh(authToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${SCHWAB_BACKEND}/api/schwab/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
