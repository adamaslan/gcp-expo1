import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import {
  acceptAll,
  buildConsent,
  rejectAll,
  CATEGORY_INFO,
  CONSENT_CATEGORIES,
  DEFAULT_CHOICES,
  type ConsentCategory,
  type ConsentChoices,
  type ConsentRecord,
} from '../lib/shared/consent';
import { saveConsent, useConsent } from '../lib/consent-store';

const OPTIONAL_CATEGORIES = CONSENT_CATEGORIES.filter((c) => !CATEGORY_INFO[c].required);

function draftFrom(record: ConsentRecord | null): ConsentChoices {
  return record ? { ...record.choices } : { ...DEFAULT_CHOICES };
}

/**
 * Self-contained consent preferences: per-category toggles for every optional
 * category, "Strictly necessary" locked on, plus Save / Reject all / Accept all.
 * No navigation dependency — mount it anywhere. Writing goes through the
 * consent-store, which notifies analytics (resets identity) and Sentry (closes)
 * before the write finishes, so a withdrawal takes effect immediately.
 * Pass `embedded` to drop the heading and padding when a host card supplies them.
 * Reject all and Accept all share one style (equal weight, no dark pattern).
 */
export function ConsentPreferences({ embedded = false }: { embedded?: boolean } = {}) {
  const { consent, loaded } = useConsent();
  const [draft, setDraft] = useState<ConsentChoices>(() => draftFrom(consent));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Follow the stored record (initial load, or a change made elsewhere).
  useEffect(() => {
    setDraft(draftFrom(consent));
  }, [consent]);

  async function persist(record: ConsentRecord) {
    setSaving(true);
    setMessage(null);
    setFailed(false);
    try {
      await saveConsent(record);
      setMessage('Your privacy choices were saved.');
    } catch {
      setFailed(true);
      setMessage('Your choice could not be saved. Optional tracking is off. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggle(category: ConsentCategory, value: boolean) {
    setDraft((prev) => ({ ...prev, [category]: value }));
    setMessage(null);
  }

  return (
    <View style={embedded ? undefined : styles.container}>
      {embedded ? null : <Text style={styles.title}>Privacy choices</Text>}
      <Text style={styles.intro}>
        You can change or withdraw these choices at any time. Changes apply immediately.
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label}>{CATEGORY_INFO.strictly_necessary.label} (always on)</Text>
          <Text style={styles.description}>
            Keeps you signed in and securely stores the settings the app needs to work. These cannot be turned off.
          </Text>
        </View>
        <Switch
          value
          disabled
          accessibilityLabel="Strictly necessary, always on"
        />
      </View>

      {OPTIONAL_CATEGORIES.map((category) => (
        <View key={category} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{CATEGORY_INFO[category].label}</Text>
            <Text style={styles.description}>{CATEGORY_INFO[category].description}</Text>
          </View>
          <Switch
            value={draft[category]}
            disabled={!loaded || saving}
            onValueChange={(value) => toggle(category, value)}
            accessibilityLabel={`${CATEGORY_INFO[category].label} tracking`}
          />
        </View>
      ))}

      {message ? (
        <Text accessibilityRole="alert" style={[styles.description, failed && styles.errorText]}>
          {message}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.button}
          disabled={!loaded || saving}
          onPress={() => persist(rejectAll())}
          accessibilityRole="button"
          accessibilityLabel="Reject all optional categories"
        >
          <Text style={styles.buttonText}>Reject all</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          disabled={!loaded || saving}
          onPress={() => persist(acceptAll())}
          accessibilityRole="button"
          accessibilityLabel="Accept all categories"
        >
          <Text style={styles.buttonText}>Accept all</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.button, styles.saveButton]}
        disabled={!loaded || saving}
        onPress={() => persist(buildConsent(draft, 'preferences'))}
        accessibilityRole="button"
        accessibilityLabel="Save my choices"
      >
        <Text style={styles.buttonText}>Save my choices</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  intro: { fontSize: 14, color: '#aaa', lineHeight: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  rowText: { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  description: { fontSize: 12, color: '#999', lineHeight: 17 },
  errorText: { color: '#f87171' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  // Same style for all three buttons, matching ConsentSheet: equal reachability.
  button: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151',
  },
  saveButton: { flex: 0, marginTop: 12 },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
