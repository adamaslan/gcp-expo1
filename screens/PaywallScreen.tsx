import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

const FEATURES = [
  'Daily signal digest with explainability',
  'Nu AI assistant (personalized to your portfolio)',
  'Portfolio health score & optimizer suggestions',
  'Watchlist alerts',
  'Morning briefing',
];

interface PaywallScreenProps {
  onClose?: () => void;
}

export default function PaywallScreen({ onClose }: PaywallScreenProps) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);
  const { getToken } = useAuth();

  async function openCheckout(plan: 'monthly' | 'annual') {
    setLoading(plan);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Sign In Required', 'Please sign in to subscribe.');
        return;
      }
      const res = await fetch(`${PORTAL_URL}/api/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`checkout failed: ${res.status}`);
      const data: unknown = await res.json();
      if (typeof data !== 'object' || data === null || !('url' in data) || typeof (data as { url: unknown }).url !== 'string') {
        throw new Error('invalid checkout response');
      }
      await Linking.openURL((data as { url: string }).url);
    } catch (err) {
      console.error('PaywallScreen checkout error', err);
      Alert.alert('Checkout Error', 'Could not open checkout. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unlock NuWrrrld Pro</Text>
        <Text style={styles.subtitle}>
          7-day free trial · cancel anytime
        </Text>
      </View>

      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        {/* Annual — featured */}
        <TouchableOpacity
          style={[styles.planBtn, styles.planBtnFeatured]}
          onPress={() => openCheckout('annual')}
          disabled={loading !== null}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Best value — save 34%</Text>
          </View>
          {loading === 'annual' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.planBtnLabel}>Annual · $79/yr</Text>
              <Text style={styles.planBtnSub}>Start 7-day free trial</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Monthly */}
        <TouchableOpacity
          style={styles.planBtn}
          onPress={() => openCheckout('monthly')}
          disabled={loading !== null}
        >
          {loading === 'monthly' ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <>
              <Text style={[styles.planBtnLabel, styles.planBtnLabelSecondary]}>
                Monthly · $9.99/mo
              </Text>
              <Text style={styles.planBtnSubSecondary}>Start 7-day free trial</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Maybe later</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.legal}>
        By subscribing you agree to our{' '}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(`${PORTAL_URL}/terms-of-service`)}>
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(`${PORTAL_URL}/privacy-policy`)}>
          Privacy Policy
        </Text>
        . This is not financial advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  featureList: {
    width: '100%',
    marginBottom: 28,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureCheck: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 16,
    marginTop: 1,
  },
  featureText: {
    fontSize: 15,
    color: '#222',
    flex: 1,
    lineHeight: 22,
  },
  plans: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  planBtn: {
    width: '100%',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
    position: 'relative',
    minHeight: 64,
    justifyContent: 'center',
  },
  planBtnFeatured: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  badge: {
    position: 'absolute',
    top: -13,
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planBtnLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  planBtnLabelSecondary: {
    color: '#2563eb',
  },
  planBtnSub: {
    fontSize: 13,
    color: '#dbeafe',
    marginTop: 2,
  },
  planBtnSubSecondary: {
    fontSize: 13,
    color: '#2563eb',
    marginTop: 2,
  },
  closeBtn: {
    marginVertical: 8,
    padding: 8,
  },
  closeBtnText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  legal: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
});
