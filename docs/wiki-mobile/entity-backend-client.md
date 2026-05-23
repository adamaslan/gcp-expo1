---
date: 2026-05-22
type: entity
tags: [http, api, backend, mobile]
sources: [../lib/api.ts, ../MULTI_BACKEND_INTEGRATION.md]
---

# Entity: Backend Client (`lib/api.ts`)

The mobile app's HTTP layer. Today it is a single function — `fetchBackend<T>(path, options)` — pinned to one host via `EXPO_PUBLIC_BACKEND_URL` at [`lib/api.ts:5`](../lib/api.ts#L5). Every backend call in the app goes through it. The single-host assumption is the central design problem this wiki tracks.

## What it is

A thin `fetch` wrapper that:

- Resolves the request URL safely against the configured `BACKEND_URL` (avoids the trap where a path starting with `/` overrides the base — see `resolveUrl()`)
- Adds `Content-Type: application/json` and an optional `Authorization: Bearer <token>` header
- Stringifies the body for non-GET methods
- Throws a typed error on non-2xx
- Returns `{}` for 204 No Content

It is **not** an SDK. It does not know what `/signals` returns vs `/screener` — every caller hand-types the response.

## Where used

- `screens/HomeScreen.tsx` — calls `getMarketData()`
- Any hook that consumes backend data (planned)
- [[entity-resilience-layer]] — wraps `fetchBackend` (planned, not wired yet)
- [[entity-monitoring]] — `lib/monitoring.ts` will observe its outcomes (planned)

## Current shape

```ts
// lib/api.ts:5
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
```

One env var. One host. Every helper in the file (`getMarketData`, `getUserProfile`) prefixes the same `BACKEND_URL`.

## Planned shape

Per [[../MULTI_BACKEND_INTEGRATION.md]] Step 2:

```
lib/http.ts                 — base helper, takes a baseUrl arg
lib/clients/gcp3.ts         — wraps gcp3 endpoints
lib/clients/holdfold.ts     — wraps holdemfoldem endpoints
lib/clients/aitext.ts       — wraps ai-text-opt endpoints (when deployed)
```

`fetchBackend` stays as a re-export pointing at `gcp3.ts` so existing screens keep compiling. See [[decision-single-backend-url-was-temporary]].

## Known failures

None recorded — the client is too thin to fail interestingly on its own. Failures live in the things it calls (backends) and the things that wrap it (resilience).

## Open questions

- Does `getToken()` (currently hardcoded to return `null` at [`lib/api.ts:11`](../lib/api.ts#L11)) need to be `async` against `expo-secure-store`, or pulled from Clerk's session at call time?
- Why does `BACKEND_URL` default to `http://localhost:3000` and not error out? In demo mode this is fine; outside demo mode it's a silent misconfig.

## See also

- [[concept-single-backend-assumption]] — the design problem this entity embodies
- [[decision-single-backend-url-was-temporary]] — the planned fix
- [[entity-resilience-layer]] — the wrapper
- [[entity-config-validator]] — the gate that should catch missing URLs but doesn't (it checks Clerk + Google, not backend URLs)
