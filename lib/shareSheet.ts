/**
 * Share sheet — native iOS/Android share via RN Share API.
 * expo-sharing is for local files; Share.share() handles text/URLs on both platforms.
 */
import { Share } from 'react-native';
import { captureException } from './sentry';
import { track } from './analytics';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

export async function shareReferralLink(authToken: string): Promise<void> {
  try {
    const res = await fetch(`${PORTAL_URL}/api/referral`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { code } = await res.json();

    const url = `${PORTAL_URL}/pricing?ref=${code}`;
    const message = `I've been using NuWrrrld Financial for AI stock signals with plain-language explanations. Try it free (7 days): ${url}`;

    await Share.share({ message });
    track('referral_sent', {});
  } catch (err) {
    captureException(err, { context: 'shareReferralLink' });
    throw err;
  }
}
