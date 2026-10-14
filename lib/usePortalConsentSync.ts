import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { getConsent, loadConsent, onConsentChange } from './consent-store';
import { syncConsentRecord, syncLegalConsent } from './clients/portalConsent';
import { clearPendingLegalConsent, takeFreshPendingLegalConsent } from './legal-consent-store';
import { getPref, setPref } from './shared/prefs';

const SYNCED_KEY = 'nu_consent_synced';

/**
 * Best-effort, non-blocking: while signed in, push a fresh pending legal
 * acceptance and the latest consent record to the portal.
 *
 * Sends run through one promise chain. Each send reads the LATEST local record
 * when it runs, so superseded intermediate records are dropped and a stale
 * grant can never land after a newer withdrawal. The last-synced marker is
 * written only for the record actually sent.
 */
export function usePortalConsentSync(): void {
  const { isSignedIn, userId, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (isSignedIn && userId) {
      wasSignedIn.current = true;
      return;
    }
    // Signed out after a session: an unsent acceptance must not leak to the next account.
    if (wasSignedIn.current) {
      wasSignedIn.current = false;
      void clearPendingLegalConsent();
    }
  }, [isSignedIn, userId]);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    let cancelled = false;
    const token = () => getTokenRef.current();
    let chain: Promise<void> = Promise.resolve();

    function enqueue(task: () => Promise<void>) {
      chain = chain.then(task).catch(() => undefined);
    }

    async function sendLegal() {
      const pending = await takeFreshPendingLegalConsent();
      if (!pending || cancelled) return;
      if (await syncLegalConsent(token)) await clearPendingLegalConsent(pending.nonce);
    }

    async function sendLatestRecord() {
      const record = getConsent(); // latest at send time, not at enqueue time
      if (!record || cancelled) return;
      const marker = `${userId}|${record.ts}`;
      if ((await getPref(SYNCED_KEY)) === marker) return;
      if (await syncConsentRecord(record, token)) await setPref(SYNCED_KEY, marker);
    }

    enqueue(sendLegal);
    enqueue(async () => {
      await loadConsent();
      await sendLatestRecord();
    });

    const unsubscribe = onConsentChange(() => enqueue(sendLatestRecord));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isSignedIn, userId]);
}
