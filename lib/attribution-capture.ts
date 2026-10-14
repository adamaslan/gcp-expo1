/**
 * attribution-capture — consent-gated first-touch acquisition capture from
 * launch / deep-link URLs. Mobile counterpart of the portal's
 * components/AttributionCapture.tsx + POST /api/attribution.
 *
 * LIMITS (read before relying on this):
 *  - Only URLs delivered to the app are seen (initial launch URL and URL
 *    events, e.g. nuwrrrld://...?utm_source=x or a universal link). Store-install
 *    referrers (Google Play Install Referrer, App Store / SKAdNetwork) are NOT
 *    captured by this path; an install from an ad with no deep link yields no touch.
 *  - Unverified on a device and against the deployed portal.
 *
 * Consent: attribution belongs to the `analytics` category (see
 * lib/shared/attribution.ts header; the portal route returns 204 and stores
 * nothing unless nu_consent.analytics is true). Same gate as lib/analytics.ts:
 * nothing is read-through, persisted or sent until the consent record is loaded
 * AND grants `analytics`. A touch seen before consent resolves is held in memory
 * only and dropped on process exit.
 *
 * Portal contract mirrored: POST {PORTAL}/api/attribution, JSON body
 * { query, referrer, landing_path }, Clerk bearer auth. The route reads consent
 * from the `nu_consent` COOKIE (not the bearer), so we send it as a Cookie
 * header, plus `nu_attrib` so the server treats our stored touch as first-touch.
 * 204 = server saw no analytics consent (not stored -> retry later); 200 = done
 * (server insert is ON CONFLICT DO NOTHING, so resending is harmless).
 * The token is never logged.
 */
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import {
  ATTRIB_COOKIE,
  ATTRIB_COOKIE_MAX_AGE,
  CLICK_ID_PARAMS,
  UTM_PARAMS,
  buildTouch,
  parseTouch,
  serialiseTouch,
  type AttributionTouch,
} from './shared/attribution';
import { CONSENT_COOKIE, isAllowed, serializeConsent } from './shared/consent';
import { getConsent } from './consent-store';
import { getPref, setPref } from './shared/prefs';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';
const SENT_KEY = 'nu_attrib_sent';
const MS_PER_SECOND = 1000;
const FIRST_TOUCH_TTL_MS = ATTRIB_COOKIE_MAX_AGE * MS_PER_SECOND;

/** Build a touch from a launch URL; null when the URL carries nothing attributable. */
export function touchFromUrl(url: string | null | undefined, now: Date = new Date()): AttributionTouch | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(parsed.queryParams ?? {})) {
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first === 'string') params.set(key, first);
    }
    // No referrer: a launch URL has none. Landing path is the in-app route.
    return buildTouch(params, { landingPath: parsed.path ? `/${parsed.path}` : null, now });
  } catch {
    return null;
  }
}

async function readStoredTouch(now: Date): Promise<AttributionTouch | null> {
  const touch = parseTouch(await getPref(ATTRIB_COOKIE));
  if (!touch) return null;
  if (now.getTime() - Date.parse(touch.ts) > FIRST_TOUCH_TTL_MS) return null; // 90-day window lapsed
  return touch;
}

function analyticsGranted(): boolean {
  return isAllowed(getConsent(), 'analytics');
}

async function clearSentFlag(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SENT_KEY);
  } catch {
    /* best-effort */
  }
}

// Single module-level chain: every storage read-modify-write of the touch and
// sent flag runs one at a time, so the 90-day first-touch rule is evaluated
// atomically. Never held across a network call or the token fetch.
let storageChain: Promise<unknown> = Promise.resolve();
function withStorageLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = storageChain.then(fn, fn);
  storageChain = run.catch(() => undefined);
  return run;
}

async function clearUnlocked(): Promise<void> {
  for (const key of [ATTRIB_COOKIE, SENT_KEY]) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* best-effort */
    }
  }
}

/** Delete the persisted touch and sent flag (consent revoked). Idempotent; never throws. */
export function clearAttributionState(): Promise<void> {
  return withStorageLock(clearUnlocked);
}

/**
 * Persist `candidate` as first-touch unless a live (<90 day) one exists.
 * Consent is re-read right before the write and again after it (a revocation
 * during the awaits wipes what was just written). Returns the effective first touch.
 */
export function persistFirstTouch(
  candidate: AttributionTouch | null,
  now: Date = new Date(),
): Promise<AttributionTouch | null> {
  return withStorageLock(() => persistUnlocked(candidate, now));
}

async function persistUnlocked(
  candidate: AttributionTouch | null,
  now: Date,
): Promise<AttributionTouch | null> {
  if (!analyticsGranted()) return null;
  const existing = await readStoredTouch(now);
  if (existing) return existing;
  if (!candidate || !analyticsGranted()) return null;
  // A sent flag must never outlive the touch it refers to: drop it first.
  await clearSentFlag();
  await setPref(ATTRIB_COOKIE, serialiseTouch(candidate));
  if (!analyticsGranted()) {
    await clearUnlocked();
    return null;
  }
  return candidate;
}

function queryOf(touch: AttributionTouch): string {
  const params = new URLSearchParams();
  for (const key of UTM_PARAMS) if (touch.utm[key]) params.set(key, touch.utm[key] as string);
  for (const key of CLICK_ID_PARAMS) if (touch.click_ids[key]) params.set(key, touch.click_ids[key] as string);
  return `?${params.toString()}`;
}

/**
 * POST the stored first touch once. Requires a non-empty Clerk token and granted
 * analytics consent, re-read after every await and immediately before fetch.
 * Marked "sent" only on a 200 whose body is `{ok:true, captured:true}` while a
 * bearer token was sent. Caveat: the portal route returns that same 200 even when
 * its auth() resolves no user (it then skips the DB insert), so "sent" means "the
 * server accepted a token-bearing request", not a proven row; unverified against
 * the deployed portal. 204 (no consent seen server-side) and everything else retry
 * next launch. Never throws; nothing sensitive is logged.
 */
export async function reportFirstTouch(getToken: () => Promise<string | null>): Promise<void> {
  if (!analyticsGranted()) return;
  try {
    const { touch, alreadySent } = await withStorageLock(async () => {
      const stored = await readStoredTouch(new Date());
      return { touch: stored, alreadySent: !!stored && (await getPref(SENT_KEY)) === stored.ts };
    });
    if (!touch || alreadySent) return;
    const token = await getToken();
    if (!token) return;
    const consent = getConsent(); // fresh, after all awaits
    if (!consent || !isAllowed(consent, 'analytics')) return;
    const res = await fetch(`${PORTAL_URL}/api/attribution`, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Cookie: `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(consent))}; ${ATTRIB_COOKIE}=${encodeURIComponent(serialiseTouch(touch))}`,
      },
      body: JSON.stringify({ query: queryOf(touch), referrer: touch.referrer ?? '', landing_path: touch.landing_path }),
    });
    if (res.status !== 200) return;
    const body: unknown = await res.json().catch(() => null);
    const accepted = !!body && typeof body === 'object' && (body as { ok?: unknown; captured?: unknown }).ok === true
      && (body as { captured?: unknown }).captured === true;
    if (!accepted || !analyticsGranted()) return;
    // The flag records WHICH touch was sent (its ts); it is written only if that
    // touch is still the stored one, so it can never mark a different touch.
    await withStorageLock(async () => {
      if (!analyticsGranted()) return;
      const current = await readStoredTouch(new Date());
      if (!current || current.ts !== touch.ts) return;
      await setPref(SENT_KEY, touch.ts);
      // Revocation may have fired while the write was pending.
      if (!analyticsGranted()) await clearUnlocked();
    });
  } catch {
    // Best-effort: a lost report retries next launch.
  }
}
