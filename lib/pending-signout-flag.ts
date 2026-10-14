/**
 * Persistence for the "account deleted, sign-out failed" flag.
 *
 * lib/secure-storage.ts swallows every storage error (returns null / no-ops), which
 * is wrong for this flag: a failed write or read must be observable. These helpers
 * use the raw storage APIs and THROW on failure; callers decide how to degrade.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { DELETED_PENDING_SIGNOUT_KEY } from './auth-constants';

const FLAG_SET = '1';

/** Resolves true/false; throws if storage could not be read (distinct from "missing"). */
export async function readPendingSignOutFlag(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(DELETED_PENDING_SIGNOUT_KEY) === FLAG_SET;
  }
  return (await SecureStore.getItemAsync(DELETED_PENDING_SIGNOUT_KEY)) === FLAG_SET;
}

/** Throws if the flag could not be persisted (or cleared). */
export async function writePendingSignOutFlag(pending: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    if (pending) localStorage.setItem(DELETED_PENDING_SIGNOUT_KEY, FLAG_SET);
    else localStorage.removeItem(DELETED_PENDING_SIGNOUT_KEY);
    return;
  }
  if (pending) await SecureStore.setItemAsync(DELETED_PENDING_SIGNOUT_KEY, FLAG_SET);
  else await SecureStore.deleteItemAsync(DELETED_PENDING_SIGNOUT_KEY);
}
