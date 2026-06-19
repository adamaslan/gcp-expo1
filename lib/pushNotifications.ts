/**
 * Push notification opt-in — wraps Expo Notifications.
 * Call requestPushPermission() after the user has seen first value.
 * Never prompt on first launch — wait until the user has received a signal.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { captureException } from './sentry';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PushPermissionStatus;
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  const current = await getPushPermissionStatus();
  if (current === 'granted') return 'granted';
  if (current === 'denied') return 'denied'; // iOS: can't re-prompt, send to Settings

  const { status } = await Notifications.requestPermissionsAsync();
  return status as PushPermissionStatus;
}

export async function registerPushToken(authToken: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    await fetch(`${PORTAL_URL}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
    });
  } catch (err) {
    captureException(err, { context: 'registerPushToken' });
  }
}
