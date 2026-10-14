import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { acceptAll, rejectAll, CATEGORY_INFO, CONSENT_CATEGORIES } from '../lib/shared/consent';
import { saveConsent, useConsent } from '../lib/consent-store';
import { syncSentryWithConsent } from '../lib/sentry';

/**
 * First-run consent sheet. Shown until the user makes a choice under the
 * current CONSENT_VERSION. "Accept all" and "Reject all" are equally sized,
 * equally prominent single taps — no pre-ticked state, no dark pattern.
 * Mounting this also wires Sentry to follow the stored choice.
 */
export function ConsentSheet() {
  const { shouldPrompt } = useConsent();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => syncSentryWithConsent(), []);

  async function choose(build: typeof acceptAll) {
    setSaving(true);
    setError(null);
    try {
      await saveConsent(build());
    } catch {
      setError('Your choice could not be saved. Optional tracking is off. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={shouldPrompt} animationType="slide" transparent onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.title}>Your privacy choices</Text>
          <ScrollView style={styles.body}>
            <Text style={styles.intro}>
              We only use what is strictly necessary unless you say otherwise.
            </Text>
            {CONSENT_CATEGORIES.map((category) => (
              <View key={category} style={styles.row}>
                <Text style={styles.label}>
                  {CATEGORY_INFO[category].label}
                  {CATEGORY_INFO[category].required ? ' (always on)' : ''}
                </Text>
                <Text style={styles.description}>
                  {category === 'strictly_necessary'
                    ? 'Keeps you signed in and securely stores the settings the app needs to work. These cannot be turned off.'
                    : CATEGORY_INFO[category].description}
                </Text>
              </View>
            ))}
          </ScrollView>
          {error ? <Text accessibilityRole="alert" style={styles.description}>{error}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.button}
              disabled={saving}
              onPress={() => choose(rejectAll)}
              accessibilityRole="button"
              accessibilityLabel="Reject all optional categories"
            >
              <Text style={styles.buttonText}>Reject all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              disabled={saving}
              onPress={() => choose(acceptAll)}
              accessibilityRole="button"
              accessibilityLabel="Accept all categories"
            >
              <Text style={styles.buttonText}>Accept all</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    maxHeight: '80%', backgroundColor: '#0f0f0f', padding: 20, paddingBottom: 32,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  body: { marginBottom: 16 },
  intro: { fontSize: 14, color: '#aaa', lineHeight: 20, marginBottom: 12 },
  row: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  description: { fontSize: 12, color: '#999', lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 12 },
  // Identical style for both buttons: equal reachability is a requirement, not a taste call.
  button: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151',
  },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
