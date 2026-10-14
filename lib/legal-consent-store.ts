/**
 * legal-consent-store — remembers that the user ticked the ToS/Privacy box at
 * sign-up until it has been delivered to the portal (the Clerk session may not
 * exist yet, e.g. during email verification). Versions come from the shared
 * legal-consent module; the portal re-derives them server-side.
 */
import { requiredConsentEvents } from './shared/legal-consent';
import { getPref, setPref } from './shared/prefs';
import * as SecureStore from 'expo-secure-store';

const PENDING_KEY = 'nu_legal_consent_pending';

export interface PendingLegalConsent {
  events: Array<{ doc: string; version: string }>;
  ts: string;
}

/** Record express acceptance (call only after the user ticks the checkbox). */
export async function markLegalConsentAccepted(now: Date = new Date()): Promise<void> {
  const pending: PendingLegalConsent = { events: requiredConsentEvents(), ts: now.toISOString() };
  await setPref(PENDING_KEY, JSON.stringify(pending));
}

export async function hasPendingLegalConsent(): Promise<boolean> {
  return (await getPref(PENDING_KEY)) !== null;
}

export async function clearPendingLegalConsent(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_KEY);
  } catch {
    /* best-effort */
  }
}
