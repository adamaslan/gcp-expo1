/**
 * Share sheet — native iOS/Android share via Expo Sharing.
 * Fetches the user's referral code, builds a share URL, opens the system sheet.
 */
import * as Sharing from 'expo-sharing';
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

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      // Fallback: copy to clipboard (handled by caller via Clipboard API).
      throw new Error('share_unavailable');
    }

    // expo-sharing works with files; for text-only, open the URL in the share sheet.
    await Sharing.shareAsync(url, { dialogTitle: message });
    track('referral_sent', {});
  } catch (err) {
    if (err instanceof Error && err.message !== 'share_unavailable') {
      captureException(err, { context: 'shareReferralLink' });
    }
    throw err;
  }
}
