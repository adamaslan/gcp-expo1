# Wiki Schema — gcp3-mobile

The LLM owns this layer entirely. You (the user) curate sources and ask questions. The LLM writes and maintains every wiki page. For the philosophy behind this pattern, see [[ORIGIN]]. This schema mirrors `gcp3/docs/wiki-gcp3/SCHEMA.md` — keep them in sync.

## Three Layers

```
docs/wiki-mobile/raw/      — IMMUTABLE source documents. User drops files here. LLM reads, never writes.
docs/wiki-mobile/          — LLM-written pages: entities, concepts, decisions, incidents, synthesis.
docs/wiki-mobile/SCHEMA.md — This file. Co-evolved by user + LLM. Governs all wiki behavior.
```

Raw sources are evidence; wiki pages are interpretation. Never copy source material verbatim — always synthesize, integrate, and cross-link.

## Directory Layout

```
docs/wiki-mobile/
├── SCHEMA.md              — This file (conventions + workflow)
├── ORIGIN.md              — Why this pattern exists
├── index.md               — Catalog of every page + one-line summary
├── log.md                 — Append-only chronological record
│
├── overview.md            — System map, stack, current health
│
├── entity-*.md            — One page per named component (the hubs)
├── concept-*.md           — Cross-cutting patterns
├── incident-*.md          — One page per production incident
├── decision-*.md          — Recorded design decisions
│
├── architecture-*.md      — Cross-cutting architecture pages
│
└── raw/                   — Immutable source documents
```

## Page Types & What They Must Contain

### Entity Pages (`entity-*.md`)
One page per named component. These are the hubs — everything links to entities.

Required sections:
- **What it is** — one paragraph
- **Where used** — bullet list of other pages that reference it
- **Known failures** — links to incident pages
- **Open questions** — things the wiki doesn't yet know
- **See also** — cross-links

### Concept Pages (`concept-*.md`)
Cross-cutting patterns and design choices.

Required sections:
- **The pattern** — what it is and why it exists
- **Where it appears** — which entities implement it
- **Contradictions / tensions** — where the pattern is violated or stressed
- **See also**

### Incident Pages (`incident-*.md`)
One page per production incident. Must update every entity page it touches.

Required sections:
- **Date & severity**
- **What happened** — factual timeline
- **Root cause**
- **Resolution**
- **Impact on design** — links to affected entity/concept pages
- **Open items**

### Decision Pages (`decision-*.md`)
Recorded design decisions. The single most important thing a decision page does is explain *why*.

Required sections:
- **Decision** — one sentence
- **Date**
- **Context** — what problem was being solved
- **Alternatives considered** — what was rejected and why
- **Consequences** — what the decision rules out, what it enables
- **Validated by** — incidents or evidence
- **See also**

## Page Conventions

- **Filename**: kebab-case prefix tells the type: `entity-`, `concept-`, `incident-`, `decision-`
- **Frontmatter**:
  ```yaml
  ---
  date: 2026-05-22
  type: entity | concept | incident | decision | overview
  tags: [clerk, auth, mobile]
  sources: [raw/some-doc.md]
  ---
  ```
- **Link style**: `[[filename|text]]`
- **Contradiction notices**:
  ```
  > ⚠️ Contradiction: PHASE2_STATUS says X; .env.example says Y. Unresolved.
  ```
- **Open question notices**:
  ```
  > ❓ Open question: Does Clerk Expo's getToken() include a JWT the gcp3 backend can verify?
  ```

## Cross-Repo Boundary

This wiki is mobile-only. When a question crosses into the backend, link to the gcp3 wiki by path (not `[[…]]`, since Obsidian-style wikilinks don't cross vaults):

```
See `gcp3/docs/wiki-gcp3/entity-firestore-cache.md` for cache TTL behavior.
```

Per the cross-repo workflow rules in `.claude/CLAUDE.md` rule 7: never edit the other repo's wiki from a mobile session.

## Secret Policy

**Never write real API keys, tokens, Clerk publishable keys, GCP project IDs, service URLs, or Cloud Run hostnames into wiki pages.**

Use placeholders:
- Clerk publishable key → `{clerk-publishable-key}`
- Backend URL → `{gcp3-backend-url}`, `{holdfold-backend-url}`
- Secrets → `{secret-name}` or "stored in Expo secret store / EAS secret"

## On Ingest (`/wiki ingest <path>`)

1. **Secret scan** — grep source file for credentials before reading
2. **Read source** — extract key facts, decisions, contradictions
3. **Identify which pages to create or update**:
   - New entity? Create `entity-*.md`
   - New incident? Create `incident-*.md` AND update every entity page it touches
   - Design decision revealed? Create or update `decision-*.md`
   - Contradiction with existing page? Mark it inline on both pages
4. **Never copy verbatim** — synthesize, integrate, cross-link
5. **Update index.md** — add any new pages
6. **Append to log.md** — `## [{date}] ingest | {source title} | pages touched: N`

A single source should typically touch 3–10 pages. If it touches 1, you're not integrating enough.

## On Query (`/wiki query <question>`)

1. Read `index.md` to find relevant pages
2. Read those pages; note any open questions or contradictions relevant to the query
3. Synthesize answer with citations: `[[entity-clerk-expo#known-failures|entity-clerk-expo]]`
4. If the answer reveals something worth keeping, offer to file it as a new page
5. Append to `log.md`: `## [{date}] query | {question summary}`

## On Lint (`/wiki lint`)

Run periodically. Report:
1. **Orphan pages** — no inbound links
2. **Entity pages missing Known Failures section**
3. **Incident pages not linked from affected entity pages**
4. **Unresolved contradictions** — `⚠️ Contradiction` markers older than 2 ingests
5. **Open questions** — `❓` markers that could be answered by a new source
6. **Stale claims** — cross-check against current code
7. **Concepts mentioned inline that need their own page**

## Log Format

```
## [2026-05-22] ingest | MULTI_BACKEND_INTEGRATION.md | pages touched: 7
## [2026-05-22] query | Where does Clerk's token go?
## [2026-05-22] lint | 1 orphan, 2 open questions
```
