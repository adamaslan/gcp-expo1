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

export interface PendingLegalConsent {
  events: Array<{ doc: string; version: string }>;
  ts: string;
  nonce: string;
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
