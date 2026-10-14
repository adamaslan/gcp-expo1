import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { getConsent, loadConsent, onConsentChange } from './consent-store';
import { syncConsentRecord, syncLegalConsent } from './clients/portalConsent';
import { clearPendingLegalConsent, hasPendingLegalConsent } from './legal-consent-store';
import { getPref, setPref } from './shared/prefs';
import type { ConsentRecord } from './shared/consent';

const SYNCED_KEY = 'nu_consent_synced';

/**
 * Best-effort, non-blocking: while signed in, push a pending legal acceptance
 * and the latest consent record to the portal. The last record delivered per
 * user is remembered so launches don't append duplicate server rows.
 */
export function usePortalConsentSync(): void {
  const { isSignedIn, userId, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    let cancelled = false;
    const token = () => getTokenRef.current();

    async function pushRecord(record: ConsentRecord | null) {
      if (!record || cancelled) return;
      const marker = `${userId}|${record.ts}`;
      if ((await getPref(SYNCED_KEY)) === marker) return;
      if (await syncConsentRecord(record, token)) await setPref(SYNCED_KEY, marker);
    }

    (async () => {
      if (await hasPendingLegalConsent()) {
        if (await syncLegalConsent(token)) await clearPendingLegalConsent();
      }
      await loadConsent();
      await pushRecord(getConsent());
    })().catch(() => undefined);

    const unsubscribe = onConsentChange((record) => {
      void pushRecord(record).catch(() => undefined);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isSignedIn, userId]);
}
