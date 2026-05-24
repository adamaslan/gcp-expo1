# Origin — Why This Wiki Exists

The mobile app spans three backends (gcp3, holdemfoldem, ai-text-opt), four config surfaces (Clerk, Google OAuth, Expo env, EAS secrets), and a five-phase build plan documented across a dozen `PHASE*.md` files at the repo root. That documentation answers "what was built when," but it does not answer "what depends on what, and what broke last."

This wiki does. It is the second layer in the three-layer pattern from `gcp3/docs/wiki-gcp3/ORIGIN.md`:

1. **Raw sources** — phase docs, README, the integration plan in [[../MULTI_BACKEND_INTEGRATION.md]], session notes. Immutable. The user adds them.
2. **Wiki pages** — entities, concepts, decisions, incidents. LLM-written, synthesized from sources. This layer.
3. **Schema** — the conventions in [[SCHEMA]]. Co-evolved between user and LLM. Governs how layers 1 and 2 interact.

## Why mobile needs its own wiki (not just shared with gcp3)

The cross-repo workflow rules (`.claude/CLAUDE.md` rule 7) require keeping mobile sessions out of the backend repo. A shared wiki would force every mobile question to reach into `gcp3/docs/wiki-gcp3/` to find anything — and any answer that updated the wiki would risk crossing the boundary the rules exist to enforce.

Two wikis, one per repo, cross-referenced by file path, matches the existing rule set.

## What this wiki is not

- **Not a phase tracker.** The `PHASE*.md` files at the repo root already do that. This wiki extracts what survives from those phases: entities (Clerk, the backend client, the resilience layer), decisions (demo mode default-on, single-backend assumption), and incidents (when those decisions bit us).
- **Not API documentation.** The integration plan at [[../MULTI_BACKEND_INTEGRATION.md]] enumerates endpoints. This wiki explains the boundary conditions and design choices around how the mobile app calls them.
- **Not aspirational.** If a page describes a behavior, that behavior should be verifiable by grep against the current code (cross-repo rule 9). Aspirational claims get marked `❓ Open question` until they're real.

## See also

- [[SCHEMA]] — rules of engagement
- `gcp3/docs/wiki-gcp3/ORIGIN.md` — the parent pattern this one mirrors
