/**
 * portalConsent — best-effort server sync of consent for signed-in users.
 *
 * Contracts (read from the portal's route handlers):
 *   POST /api/consent        body { choices: {preferences, analytics, marketing}, source }
 *                            -> appends a consent_records row for the Clerk user.
 *   POST /api/legal-consent  body { surface } (versions are server-side, body is ignored
 *                            beyond `surface`) -> records ToS + Privacy acceptance.
 * Both authenticate via Clerk auth() from `Authorization: Bearer <session token>`,
 * the same pattern as lib/useSubscription.ts.
 *
 * Failures are non-fatal and never logged with the token or response body.
 */
import type { ConsentRecord } from '../shared/consent';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';
const SURFACE = 'mobile';

export type GetToken = () => Promise<string | null>;

/** A stalled request must not block the serialized sync queue behind it. */
export const REQUEST_TIMEOUT_MS = 10_000;

async function postJson(path: string, body: unknown, getToken: GetToken): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const token = await Promise.race([
      getToken(),
      new Promise<null>((resolve) => controller.signal.addEventListener('abort', () => resolve(null))),
    ]);
    if (!token) return false;
    const res = await fetch(`${PORTAL_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[portalConsent] ${path} responded ${res.status}`);
      return false;
    }
    return true;
  } catch {
    console.warn(`[portalConsent] ${path} request failed or timed out`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns true when the portal accepted the record. */
export function syncConsentRecord(record: ConsentRecord, getToken: GetToken): Promise<boolean> {
  const { preferences, analytics, marketing } = record.choices;
  return postJson('/api/consent', { choices: { preferences, analytics, marketing }, source: record.source }, getToken);
}

/** Returns true when the portal recorded the current ToS + Privacy acceptance. */
export function syncLegalConsent(getToken: GetToken): Promise<boolean> {
  return postJson('/api/legal-consent', { surface: SURFACE }, getToken);
}
