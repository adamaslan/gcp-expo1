import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAuthContext } from '@/lib/auth-provider';
import { theme } from '@/lib/ui/theme';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

export default function SettingsScreen() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuthContext();
  const [loading, setLoading] = useState(false);

  if (!isLoaded || !user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.accent.indigo} />
      </View>
    );
  }

  const subscriptionStatus = (user.publicMetadata?.subscription_status as string) ?? 'free';
  const isPro = subscriptionStatus === 'pro';

  const handleOpenURL = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Error', 'Cannot open this link');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error('Failed to open URL:', err);
      Alert.alert('Error', 'Failed to open link');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = async () => {
    setLoading(true);
    handleOpenURL(`${PORTAL_URL}/pricing`);
  };

  const handleManageBilling = async () => {
    setLoading(true);
    handleOpenURL(`${PORTAL_URL}/dashboard/billing`);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign out?', 'You will be logged out of your account.', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Sign out',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            console.error('Sign out error:', err);
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'User'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.emailAddresses[0]?.emailAddress}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Plan</Text>
          <Text style={[styles.value, isPro && styles.proBadge]}>
            {isPro ? 'Pro' : 'Free'}
          </Text>
        </View>
        {!isPro && (
          <TouchableOpacity
            style={styles.button}
            onPress={handleOpenCheckout}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : 'Upgrade to Pro'}
            </Text>
          </TouchableOpacity>
        )}
        {isPro && (
          <TouchableOpacity
            style={styles.button}
            onPress={handleManageBilling}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : 'Manage Subscription'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Links</Text>
        <TouchableOpacity
          style={styles.link}
          onPress={() => Linking.openURL(`${PORTAL_URL}/privacy-policy`)}
        >
          <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.link}
          onPress={() => Linking.openURL(`${PORTAL_URL}/terms-of-service`)}
        >
          <Text style={styles.linkText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text style={styles.dangerButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderColor: theme.border.subtle,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    color: theme.text.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: theme.text.primary,
  },
  proBadge: {
    color: theme.accent.green ?? '#35d07f',
  },
  button: {
    backgroundColor: theme.accent.indigo,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: theme.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  link: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomColor: theme.border.subtle,
    borderBottomWidth: 1,
  },
  linkText: {
    color: theme.accent.indigo,
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderColor: theme.accent.red,
    borderWidth: 1,
  },
  dangerButtonText: {
    color: theme.accent.red,
    fontSize: 14,
    fontWeight: '600',
  },
});
