// Cross-platform secure storage shim.
// Native (iOS/Android): expo-secure-store (Keychain / EncryptedSharedPreferences)
// Web: localStorage (NOT secure, but the only option without a service worker
//      and acceptable for dev). Production web apps should hold Clerk session
//      tokens in httpOnly cookies anyway, which Clerk's web SDK handles itself
//      when running in a real browser.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore
  }
}

// Aliases matching the expo-secure-store API surface, so callers that import
// this as a drop-in replacement (`import * as SecureStore from './secure-storage'`)
// keep working without changing their call sites.
export const getItemAsync = getItem;
export const setItemAsync = setItem;
export const deleteItemAsync = deleteItem;

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}
