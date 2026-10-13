/**
 * consent-store — mobile persistence + in-memory state for the shared consent
 * model (lib/shared/consent.ts, byte-identical to the portal's copy).
 *
 * The portal stores the record in the `nu_consent` cookie; mobile stores the
 * same serialized record under the same key via lib/shared/prefs.ts
 * (expo-secure-store). Until loadConsent() resolves — and whenever the stored
 * value is missing, malformed, or from an older CONSENT_VERSION — every
 * non-necessary category is DENIED (isAllowed fails safe on null).
 */
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  CONSENT_COOKIE,
  needsPrompt,
  parseConsent,
  serializeConsent,
  type ConsentRecord,
} from './shared/consent';
import { getPref } from './shared/prefs';

type Listener = (record: ConsentRecord | null) => void;

let current: ConsentRecord | null = null;
let loaded = false;
let loading: Promise<ConsentRecord | null> | null = null;
const listeners = new Set<Listener>();
let saving: Promise<void> = Promise.resolve();

function notify(): void {
  for (const listener of listeners) listener(current);
}

/** Synchronous read for gates (analytics, sentry). Null until loaded or chosen. */
export function getConsent(): ConsentRecord | null {
  return current;
}

/** Read the persisted record once; later calls reuse the same promise. */
export function loadConsent(): Promise<ConsentRecord | null> {
  if (!loading) {
    loading = getPref(CONSENT_COOKIE).then((raw) => {
      current = parseConsent(raw);
      loaded = true;
      notify();
      return current;
    });
  }
  return loading;
}

/** Persist a choice made via buildConsent/acceptAll/rejectAll and broadcast it. */
export async function saveConsent(record: ConsentRecord): Promise<void> {
  const operation = saving.then(async () => {
    // Finish any initial read before it can restore a prior grant over a choice.
    await loadConsent();
    current = null;
    loaded = true;
    notify();
    // Consent writes must propagate storage errors; ordinary prefs stay best-effort.
    await SecureStore.setItemAsync(CONSENT_COOKIE, serializeConsent(record));
    current = record;
    notify();
  });
  saving = operation.catch(() => undefined);
  return operation;
}

export function onConsentChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React view of the store: `shouldPrompt` is true only after the stored value was read. */
export function useConsent(): { consent: ConsentRecord | null; loaded: boolean; shouldPrompt: boolean } {
  const [state, setState] = useState({ consent: current, loaded });

  useEffect(() => {
    const unsubscribe = onConsentChange((record) => setState({ consent: record, loaded }));
    // Catch a load that resolved between the first render and this subscription.
    setState({ consent: current, loaded });
    void loadConsent();
    return unsubscribe;
  }, []);

  return { ...state, shouldPrompt: state.loaded && needsPrompt(state.consent) };
}
