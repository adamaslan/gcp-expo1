/**
 * prefs — small persistence seam so shared logic (e.g. signals filter state)
 * doesn't need to know whether it's running on mobile (expo-secure-store)
 * or web (localStorage). Mirrored in nuwrrrld-portal/lib/shared/prefs.ts
 * with the same get/set signature.
 */
import * as SecureStore from 'expo-secure-store';

export async function getPref(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* best-effort — a failed write shouldn't break the calling feature */
  }
}
