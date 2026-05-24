---
date: 2026-05-22
type: entity
tags: [observability, monitoring, telemetry]
sources: [../lib/monitoring.ts, ../api/metrics.ts, ../api/health.ts]
---

# Entity: Monitoring (`lib/monitoring.ts`)

The mobile app's observability sink. Captures structured events for auth, network, and (planned) per-backend call outcomes. Surfaced via `GET /api/health` ([`api/health.ts`](../api/health.ts)) and `GET /api/metrics` ([`api/metrics.ts`](../api/metrics.ts)).

## What it is

A logger-shaped module that emits typed events with consistent fields (timestamp, severity, source, optional correlation id). It is **not** a vendor SDK — no Sentry, no Datadog wiring today. Events are collected in-process and exposed via the metrics endpoint for whatever ingests them later.

## Where used

- [[entity-resilience-layer]] — `auth-logger.ts` emits to monitoring
- [[entity-backend-client]] — planned: emit per-call outcome (success/fail/timeout) with backend tag
- `api/health.ts` and `api/metrics.ts` — readback surfaces

## Event shape (effective contract)

| Field | Required | Notes |
|-------|----------|-------|
| `timestamp` | yes | ISO 8601 |
| `severity` | yes | info / warn / error |
| `source` | yes | `auth` / `network` / `config` |
| `backend` | when source=network | `gcp3` / `holdfold` / `aitext` (planned) |
| `outcome` | when source=network | `ok` / `4xx` / `5xx` / `timeout` / `circuit_open` |

The `backend` and `outcome` fields are required by the multi-backend plan ([[../MULTI_BACKEND_INTEGRATION.md]] Step 7) but not enforced yet — today's events are mostly auth-flow.

## Known failures

None recorded.

## Open questions

- Is there a retention policy for in-process events? If the app runs for a long session, does memory grow unboundedly?
- Does `api/metrics.ts` require auth? If not, the in-process events are exposed publicly — fine for booleans, risky if any payload data leaks in.
- When the app backgrounds, events buffered in-process are lost on app kill. Acceptable for telemetry; not acceptable for any "must-deliver" audit trail.

## See also

- [[entity-resilience-layer]] — the upstream emitter
- [[entity-backend-client]] — the planned upstream emitter
