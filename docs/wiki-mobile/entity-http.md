---
date: 2026-05-23
type: entity
tags: [http, transport, mobile]
sources: [../lib/http.ts, ../lib/clients/, ../lib/resilience/network-resilience.ts, ../lib/monitoring.ts]
---

# Entity: HTTP Helper (`lib/http.ts`)

The shared HTTP primitive every per-backend client wraps. Introduced in PR #5 as the seam that broke the [[concept-single-backend-assumption]]. One function, one job: take a `baseUrl` and a `path`, return a typed JSON response, with timeout, retry, and monitoring woven in.

## What it is

```ts
export async function httpJson<T>(
  baseUrl: string,
  path: string,
  options: HttpOptions = {}
): Promise<T>
```

Options: `method`, `body`, `params`, `token`, `timeoutMs` (default 10s).

Internally it:

1. Resolves the URL safely against `baseUrl` (uses `URL` constructor; prevents leading-slash path overrides — same pattern the old `lib/api.ts` used)
2. Wraps `fetch` in `withRetry` from [[entity-resilience-layer]] — max 3 attempts, only retries on 5xx / network errors, never on 4xx (the `shouldRetry` predicate sniffs the error message for "4")
3. Aborts via `AbortController` if `timeoutMs` elapses
4. Records a `metric` to [[entity-monitoring]] keyed by hostname + path, with status `success | failure | timeout` and duration in ms
5. Throws on non-2xx with a useful error string (`HTTP <code>: <body>`)
6. Returns `{}` for 204 No Content

## Where used

- [[entity-backend-client]] — `lib/clients/gcp3.ts`, `holdfold.ts`, `aitext.ts` all call `httpJson` with their own base URL
- `lib/api.ts` (legacy shim) — uses `httpJson` against the gcp3 base URL so `fetchBackend()` still works
- [[entity-council-composer]] — indirectly, via `aitext.ts`'s `ragChat()` call

## Configuration

No env vars of its own. The base URL is provided by callers — each client module resolves its own `EXPO_PUBLIC_*_BACKEND_URL` (see [[entity-config-validator#backend-urls]]).

## Retry policy

Lives in [[entity-resilience-layer#withretry]]:

```ts
withRetry(() => fetch(...), {
  maxAttempts: 3,
  shouldRetry: (err) => !err.message.includes('4'),  // sniff for 4xx
});
```

Caveat: the `shouldRetry` predicate is heuristic — any error message containing the digit `4` won't retry. Good enough today since `httpJson` throws errors of the form `HTTP <code>: <body>`. If error message format ever changes, the predicate needs updating.

## Monitoring

Every call records:

```ts
monitoring.recordMetric(
  `http:${hostname}:${path}`,
  status,        // 'success' | 'failure' | 'timeout'
  Date.now() - start,
  { status?: <http-status> }
);
```

This means [[entity-monitoring]] can compute success rate / avg duration per backend without any structured tag — the hostname is embedded in the metric name. Implicit but workable.

## Known failures

None recorded yet. Two failure modes worth watching:

1. **Browser "Failed to fetch" vs. server 503.** When a backend is fully unreachable (process not running), `fetch` throws a generic TypeError that the user sees as "Failed to fetch <path>". This happened repeatedly during PR #6 dev when ai-text-opt's three-process stack wasn't fully up — see [[entity-dev-launcher#aitext-is-actually-three-processes]].
2. **Timeout vs. retry interaction.** The 10s default timeout applies to ONE fetch attempt. With `maxAttempts=3`, a slow backend can extend the total wait to ~30s + retry delays. Callers needing faster failure should pass smaller `timeoutMs`.

## Open questions

- Should `shouldRetry` parse the actual HTTP status (we have it) instead of sniffing the error message? Currently uses string match because the `fetch` error originates from the response, not the network. The fix is to throw a custom `HttpError(code)` class and check `code` instead.
- Should `httpJson` accept a per-call retry override? Today it's not exposed in `HttpOptions`.

## See also

- [[entity-backend-client]] — the consumer surface
- [[entity-resilience-layer]] — `withRetry` lives here
- [[entity-monitoring]] — receives every call's metric
- [[concept-single-backend-assumption]] — the debt this entity helped pay down
- [[entity-dev-launcher]] — the orchestration that makes `httpJson` calls succeed in dev
