---
date: 2026-05-22
type: home
tags: [home]
---

# gcp3-mobile — Wiki

LLM-maintained knowledge base for the gcp3-mobile Expo/React Native app. Three layers: raw sources (immutable), wiki pages (LLM-written), and [[SCHEMA]] (conventions).

Sibling wiki: `gcp3/docs/wiki-gcp3/` covers the gcp3 backend this app talks to. This wiki covers the mobile client only.

## Start Here

- [[overview]] — system map, stack, current health, what's wired up vs. planned
- [[index]] — full catalog of every page by type

## Graph View Guide

Nodes are color-coded by page type:

| Color | Type | What it represents |
|-------|------|--------------------|
| 🔵 Blue | `entity-*` | Named system components (Clerk, BackendClient, ResilienceLayer) |
| 🔴 Red | `incident-*` | Production failures — link to entities they affected |
| 🟢 Green | `decision-*` | Design decisions with rationale and validation |
| 🟣 Purple | `concept-*` | Cross-cutting patterns and philosophy |
| 🟡 Yellow | `overview` | System synthesis hub |
| ⚫ Grey | `raw/*` | Immutable source documents |

**Hubs** (highly connected nodes) are the most important pages. In a healthy wiki, entity pages should be the biggest hubs.

## Active Issues

- ⚠️ [[concept-single-backend-assumption]] — `lib/api.ts` hardcodes one `BACKEND_URL`; blocks talking to holdemfoldem and ai-text-opt
- ❓ Auth boundary unclear — Clerk Expo is wired but gcp3 + holdemfoldem expose unauthenticated routes; no JWT verification on either backend yet

## Operations

```
/wiki ingest <path>   — integrate a new source doc
/wiki query <q>       — answer from the wiki with citations
/wiki lint            — find orphans, contradictions, stale claims
```
