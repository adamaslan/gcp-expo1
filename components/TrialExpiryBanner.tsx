/**
 * TrialExpiryBanner — shown inline when trial ends within 48 hours.
 * Mount at the top of DigestScreen / NuAIScreen.
 * Taps through to the upgrade URL.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useSubscription } from '../lib/useSubscription';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';
const WARN_HOURS = 48;

export function TrialExpiryBanner() {
  const { status, trialEnd } = useSubscription();

  if (status !== 'trialing' || !trialEnd) return null;

  const hoursLeft = (new Date(trialEnd).getTime() - Date.now()) / 3_600_000;
  if (hoursLeft > WARN_HOURS) return null;

  const label = hoursLeft < 1
    ? 'Trial ends in less than 1 hour'
    : `Trial ends in ${Math.ceil(hoursLeft)} hours`;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => Linking.openURL(`${PORTAL_URL}/pricing`)}
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
