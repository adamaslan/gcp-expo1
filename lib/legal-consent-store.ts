/**
 * legal-consent-store — remembers that the user ticked the ToS/Privacy box in
 * the sign-in flow until it has been delivered to the portal. The record has no
 * user id (the session does not exist yet), so it is bound to the flow by time
 * and a one-shot nonce: it is only valid for PENDING_LEGAL_TTL_MS, is cleared
 * after a successful post and on sign-out, and a stale one is never posted.
 * Versions come from the shared legal-consent module; the portal re-derives
 * them server-side.
 */
import * as SecureStore from 'expo-secure-store';
import { requiredConsentEvents } from './shared/legal-consent';

const PENDING_KEY = 'nu_legal_consent_pending';

/** The box is ticked in the same flow that creates the session. */
export const PENDING_LEGAL_TTL_MS = 15 * 60 * 1000;

/** A bound, still-unsynced acceptance outlives sign-out for this long. */
export const BOUND_LEGAL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const BOUND_KEY_PREFIX = 'nu_legal_consent_bound_';

export interface PendingLegalConsent {
  events: Array<{ doc: string; version: string }>;
  ts: string;
  nonce: string;
}

/** An acceptance consumed under one Clerk user; only that user may post it. */
export interface BoundLegalConsent extends PendingLegalConsent {
  userId: string;
}

function boundKey(userId: string): string {
  return BOUND_KEY_PREFIX + userId.replace(/[^A-Za-z0-9._-]/g, '_');
}

function newNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Persist express acceptance. Resolves true only if the write succeeded —
 * unlike prefs.setPref this must not swallow failures (fail closed).
 */
export async function markLegalConsentAccepted(now: Date = new Date()): Promise<boolean> {
  const pending: PendingLegalConsent = {
    events: requiredConsentEvents(),
    ts: now.toISOString(),
    nonce: newNonce(),
  };
  try {
    await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

/**
 * Unconditional single delete — no read, so a concurrent new write cannot be
 * erased between a read and a delete. Use for sign-out / identity change.
 */
export async function clearPendingLegalConsent(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_KEY);
  } catch {
    /* best-effort */
  }
}

/**
 * Delete only if the stored record is still `nonce`. SecureStore has no atomic
 * compare-and-delete, so this is read-then-delete: a write landing between the
 * two steps can still be erased. The window is a few ms and only reachable by
 * a new sign-in racing a just-finished post; the sync hook's generation guard
 * makes that sequence unlikely, and the failure mode is a missing (never a
 * misassigned) acceptance.
 */
export async function clearPendingLegalConsentIfNonce(nonce: string): Promise<void> {
  try {
    const current = await readPending();
    if (!current || current.nonce !== nonce) return;
    await SecureStore.deleteItemAsync(PENDING_KEY);
  } catch {
    /* best-effort */
  }
}

async function readPending(): Promise<PendingLegalConsent | null> {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Partial<PendingLegalConsent>;
    if (typeof obj.ts !== 'string' || typeof obj.nonce !== 'string') return null;
    return obj as PendingLegalConsent;
  } catch {
    return null;
  }
}

/**
 * The pending acceptance if it is fresh; otherwise null. A stale or malformed
 * record is cleared here so it can never be posted for a later account.
 */
export async function takeFreshPendingLegalConsent(now: number = Date.now()): Promise<PendingLegalConsent | null> {
  const pending = await readPending();
  if (!pending) return null;
  const age = now - Date.parse(pending.ts);
  if (!Number.isFinite(age) || age < 0 || age > PENDING_LEGAL_TTL_MS) {
    await clearPendingLegalConsentIfNonce(pending.nonce);
    return null;
  }
  return pending;
}

/**
 * Step unbound -> bound: consume a FRESH (<= TTL) pending acceptance under
 * `userId` and persist it under a per-user key, so sign-out or a switch to
 * another account cannot lose it or reassign it. Returns the bound record.
 */
export async function bindFreshPendingLegalConsent(userId: string): Promise<BoundLegalConsent | null> {
  const pending = await takeFreshPendingLegalConsent();
  if (!pending) return null;
  const bound: BoundLegalConsent = { ...pending, userId };
  try {
    await SecureStore.setItemAsync(boundKey(userId), JSON.stringify(bound));
  } catch {
    return null; // leave the unbound record in place; the TTL still applies
  }
  await clearPendingLegalConsentIfNonce(pending.nonce);
  return bound;
}

/** The unsynced acceptance bound to exactly this user, or null (expired ones are dropped). */
export async function readBoundLegalConsent(userId: string, now: number = Date.now()): Promise<BoundLegalConsent | null> {
  try {
    const raw = await SecureStore.getItemAsync(boundKey(userId));
    if (!raw) return null;
    const obj = JSON.parse(raw) as Partial<BoundLegalConsent>;
    const age = now - Date.parse(obj.ts ?? '');
    const valid =
      obj.userId === userId && typeof obj.nonce === 'string' && Number.isFinite(age) && age >= 0 && age <= BOUND_LEGAL_MAX_AGE_MS;
    if (!valid) {
      await SecureStore.deleteItemAsync(boundKey(userId));
      return null;
    }
    return obj as BoundLegalConsent;
  } catch {
    return null;
  }
}

/** Remove the bound record after it was delivered (nonce-checked; same residual window as above). */
export async function clearBoundLegalConsent(userId: string, nonce: string): Promise<void> {
  const current = await readBoundLegalConsent(userId);
  if (!current || current.nonce !== nonce) return;
  try {
    await SecureStore.deleteItemAsync(boundKey(userId));
  } catch {
    /* best-effort */
  }
}
