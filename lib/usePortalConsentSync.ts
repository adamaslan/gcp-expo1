import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { getConsent, loadConsent, onConsentChange } from './consent-store';
import { syncConsentRecord, syncLegalConsent, type GetToken } from './clients/portalConsent';
import {
  clearPendingLegalConsent,
  clearPendingLegalConsentIfNonce,
  takeFreshPendingLegalConsent,
} from './legal-consent-store';
import { getPref, setPref } from './shared/prefs';

const SYNCED_KEY = 'nu_consent_synced';

/**
 * Module-level, so every effect instance shares ONE send queue. `generation`
 * increases on every identity change (sign-out, user switch, unmount); a queued
 * send only starts if its generation is still current, and only the current
 * generation may write the last-synced marker.
 */
let generation = 0;
let chain: Promise<void> = Promise.resolve();
/** Which user first consumed which pending acceptance (by nonce). */
let consumedBy: { nonce: string; userId: string } | null = null;

function enqueue(gen: number, task: () => Promise<void>): void {
  chain = chain
    .then(() => (gen === generation ? task() : undefined))
    .catch(() => undefined);
}

async function sendLegal(gen: number, userId: string, token: GetToken): Promise<void> {
  const pending = await takeFreshPendingLegalConsent();
  if (!pending || gen !== generation) return;
  if (consumedBy?.nonce === pending.nonce && consumedBy.userId !== userId) return;
  consumedBy = { nonce: pending.nonce, userId };
  if (await syncLegalConsent(token)) await clearPendingLegalConsentIfNonce(pending.nonce);
}

async function sendLatestRecord(gen: number, userId: string, token: GetToken): Promise<void> {
  const record = getConsent(); // latest at send time, not at enqueue time
  if (!record || gen !== generation) return;
  const marker = `${userId}|${record.ts}`;
  if ((await getPref(SYNCED_KEY)) === marker) return;
  if (!(await syncConsentRecord(record, token))) return;
  if (gen === generation) await setPref(SYNCED_KEY, marker);
}

/**
 * Best-effort, non-blocking: while signed in, push a fresh pending legal
 * acceptance and the latest consent record to the portal. Only the first
 * null -> user transition may consume a pending acceptance; sign-out and a
 * direct user A -> user B switch discard it.
 */
export function usePortalConsentSync(): void {
  const { isSignedIn, userId, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const previousUser = useRef<string | null>(null);

  useEffect(() => {
    const current = isSignedIn && userId ? userId : null;
    const previous = previousUser.current;
    previousUser.current = current;

    if (previous !== current) {
      generation += 1; // supersede anything queued or about to start
      consumedBy = null;
      // Sign-out, or A -> B: the pending acceptance belongs to no one now.
      if (previous !== null) void clearPendingLegalConsent();
    }
    if (!current) return;

    const gen = generation;
    const token: GetToken = () => getTokenRef.current();

    if (previous === null) enqueue(gen, () => sendLegal(gen, current, token));
    enqueue(gen, async () => {
      await loadConsent();
      await sendLatestRecord(gen, current, token);
    });

    const unsubscribe = onConsentChange(() => enqueue(gen, () => sendLatestRecord(gen, current, token)));
    return () => {
      unsubscribe();
    };
  }, [isSignedIn, userId]);
}
