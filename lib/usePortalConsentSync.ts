import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { getConsent, loadConsent, onConsentChange } from './consent-store';
import { syncConsentRecord, syncLegalConsent, type GetToken } from './clients/portalConsent';
import {
  bindFreshPendingLegalConsent,
  clearBoundLegalConsent,
  clearPendingLegalConsent,
  readBoundLegalConsent,
} from './legal-consent-store';
import { getPref, setPref } from './shared/prefs';

const SYNCED_KEY = 'nu_consent_synced';
const LEGAL_MAX_ATTEMPTS = 5;
const LEGAL_RETRY_BASE_MS = 1_000; // 1s, 2s, 4s, 8s between attempts

/**
 * Module-level, so every effect instance shares ONE send queue. `generation`
 * increases on every identity change (sign-out, user switch, unmount); a queued
 * send only starts if its generation is still current, and only the current
 * generation may write the last-synced marker.
 */
let generation = 0;
/** Clerk user id as of the latest render (synchronous; the effect lags a render behind). */
let liveUserId: string | null = null;
const retryTimers = new Set<ReturnType<typeof setTimeout>>();

function cancelRetryTimers(): void {
  for (const timer of retryTimers) clearTimeout(timer);
  retryTimers.clear();
}

/** A send is valid only for its own generation AND while this user is still the signed-in one. */
function guardFor(gen: number, userId: string): () => boolean {
  return () => gen === generation && liveUserId === userId;
}
let chain: Promise<void> = Promise.resolve();
function enqueue(gen: number, task: () => Promise<void>): void {
  chain = chain
    .then(() => (gen === generation ? task() : undefined))
    .catch(() => undefined);
}

/**
 * Deliver the acceptance bound to `userId`. `allowBind` is true only on the
 * null -> user transition, the sole moment a fresh unbound record may be
 * consumed. Failures retry with backoff WITHOUT blocking the queue (the retry
 * re-enqueues itself); a later sign-in of the same user retries again.
 */
async function sendLegal(gen: number, userId: string, token: GetToken, allowBind: boolean, attempt = 1): Promise<void> {
  if (gen !== generation) return;
  const bound = (allowBind ? await bindFreshPendingLegalConsent(userId) : null) ?? (await readBoundLegalConsent(userId));
  if (!bound || gen !== generation) return;
  if (await syncLegalConsent(token, guardFor(gen, userId))) {
    await clearBoundLegalConsent(userId, bound.nonce);
    return;
  }
  // The post may have outlived a sign-out/unmount that already cancelled the timers.
  if (attempt >= LEGAL_MAX_ATTEMPTS || gen !== generation) return;
  const timer = setTimeout(() => {
    retryTimers.delete(timer);
    if (gen !== generation) return;
    enqueue(gen, () => sendLegal(gen, userId, token, false, attempt + 1));
  }, LEGAL_RETRY_BASE_MS * 2 ** (attempt - 1));
  retryTimers.add(timer);
}

async function sendLatestRecord(gen: number, userId: string, token: GetToken): Promise<void> {
  const record = getConsent(); // latest at send time, not at enqueue time
  if (!record || gen !== generation) return;
  const marker = `${userId}|${record.ts}`;
  if ((await getPref(SYNCED_KEY)) === marker) return;
  if (!(await syncConsentRecord(record, token, guardFor(gen, userId)))) return;
  if (gen === generation) await setPref(SYNCED_KEY, marker);
}

/**
 * Best-effort, non-blocking: while signed in, push a fresh pending legal
 * acceptance and the latest consent record to the portal. Only the first
 * null -> user transition may consume an unbound acceptance, binding it to that
 * Clerk user; sign-out and a direct A -> B switch discard unbound ones, while a
 * bound unsynced record stays for its own user only.
 */
export function usePortalConsentSync(): void {
  const { isSignedIn, userId, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const previousUser = useRef<string | null>(null);
  liveUserId = isSignedIn && userId ? userId : null;

  useEffect(() => {
    const current = isSignedIn && userId ? userId : null;
    const previous = previousUser.current;
    previousUser.current = current;

    if (previous !== current) {
      generation += 1; // supersede anything queued or about to start
      cancelRetryTimers();
      // Sign-out, or A -> B: the pending acceptance belongs to no one now.
      if (previous !== null) void clearPendingLegalConsent();
    }
    if (!current) return;

    const gen = generation;
    const token: GetToken = () => getTokenRef.current();

    enqueue(gen, () => sendLegal(gen, current, token, previous === null));
    enqueue(gen, async () => {
      await loadConsent();
      await sendLatestRecord(gen, current, token);
    });

    const unsubscribe = onConsentChange(() => enqueue(gen, () => sendLatestRecord(gen, current, token)));
    return () => {
      unsubscribe();
      generation += 1; // unmount / re-run: nothing from this instance may post afterwards
      cancelRetryTimers();
    };
  }, [isSignedIn, userId]);
}
