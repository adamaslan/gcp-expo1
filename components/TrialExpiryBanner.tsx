import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useSubscription } from '../lib/useSubscription';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';
const WARN_HOURS = 48;

export function TrialExpiryBanner() {
  const { status, trialEnd } = useSubscription();

  if (status !== 'trialing' || !trialEnd) return null;

  const expiryMs = new Date(trialEnd).getTime();
  if (Number.isNaN(expiryMs)) return null;          // malformed date
  const hoursLeft = (expiryMs - Date.now()) / 3_600_000;
  if (hoursLeft <= 0 || hoursLeft > WARN_HOURS) return null;  // expired or not yet urgent

  const label = hoursLeft < 1
    ? 'Trial ends in less than 1 hour'
    : `Trial ends in ${Math.ceil(hoursLeft)} hour${Math.ceil(hoursLeft) === 1 ? '' : 's'}`;

  async function handlePress() {
    try {
      await Linking.openURL(`${PORTAL_URL}/pricing`);
    } catch {
      // Silently ignore — URL might not open on this device
    }
  }

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label} — tap to subscribe`}
    >
      <Text style={styles.text}>⏰ {label}</Text>
      <Text style={styles.cta}>Subscribe →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fef3c7', paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#fde68a',
  },
  text: { fontSize: 13, color: '#92400e', fontWeight: '600' },
  cta: { fontSize: 13, color: '#2563eb', fontWeight: '700' },
});
