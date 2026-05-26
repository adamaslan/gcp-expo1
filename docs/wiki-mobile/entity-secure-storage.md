---
date: 2026-05-23
type: entity
tags: [storage, cross-platform, auth, mobile, web]
sources: [../lib/secure-storage.ts, ../App.tsx, ../lib/auth-provider.tsx]
---

# Entity: Secure Storage Shim (`lib/secure-storage.ts`)

Cross-platform key-value storage. Introduced in PR #5 because `expo-secure-store` doesn't work on web (it ships only native bindings) and the app needs to run on iOS, Android, AND Expo's web target. The shim picks the right backend at call time based on `Platform.OS`.

## What it is

```ts
export async function getItem(key: string): Promise<string | null>;
export async function setItem(key: string, value: string): Promise<void>;
export async function deleteItem(key: string): Promise<void>;

// Aliases so this module is a drop-in for `import * as SecureStore from 'expo-secure-store'`
export const getItemAsync = getItem;
export const setItemAsync = setItem;
export const deleteItemAsync = deleteItem;
```

Internally:

| Platform | Backend | Security |
|---|---|---|
| iOS native | `expo-secure-store` | Keychain (Secure Enclave) |
| Android native | `expo-secure-store` | EncryptedSharedPreferences |
| Web | `localStorage` | None (plain text in browser storage) |

The web fallback is explicitly NOT secure. In production web apps Clerk's own SDK handles session tokens via httpOnly cookies, so this shim is only invoked for app-level state (e.g. the `session_started_at` timestamp used by [[decision-1h-session-cap]]).

## Where used

- `App.tsx` — Clerk's `tokenCache` (passed into `<ClerkProvider>`) and the 1-hour session timestamp
- `lib/auth-provider.tsx` — caches the token reference and the session-id metadata
- (None of the per-backend clients call it directly — they're stateless wrappers around [[entity-http]].)

## Why the API mirrors expo-secure-store exactly

So callers don't have to know whether they're getting the real `expo-secure-store` or the shim. The pattern in App.tsx and auth-provider.tsx is:

```ts
import * as SecureStore from './lib/secure-storage';
// ...
await SecureStore.getItemAsync('foo');
```

That same import line used to read `from 'expo-secure-store'` directly. Swapping the path was the entire migration. See PR #5.

## Known failures

1. **Original web bug (resolved).** Before this shim, `auth-provider.tsx` called `expo-secure-store.getItemAsync` unconditionally, which threw `TypeError: ExpoSecureStore.default.getValueWithKeyAsync is not a function` on web. Fixed by routing all reads through this module.
2. **localStorage quota / privacy mode.** On web with localStorage disabled (Safari private mode, etc.) the calls silently no-op. The `try/catch` returns `null` for missing values, which Clerk and the session-cap logic handle gracefully — but a user in private mode will appear "not signed in" across reloads. Acceptable for dev; revisit if web becomes a production target.

## Open questions

- Should the web fallback prefer `sessionStorage` over `localStorage` for short-lived items (like the session timestamp)? Currently uses localStorage uniformly.
- The shim swallows all errors silently (`try/catch` with `return null` / `ignore`). Should we surface to [[entity-monitoring]] when reads/writes fail on native — those should be near-impossible and might indicate Keychain corruption?

## See also

- [[entity-clerk-expo]] — the primary consumer (token cache + 1h session cap)
- [[decision-1h-session-cap]] — uses this for the `session_started_at` timestamp
