---
date: 2026-05-22
type: concept
tags: [documentation, repo-hygiene]
sources: [../CLAUDE.md, ../.claude/CLAUDE.md]
---

# Concept: Archive, Never Delete

Project-wide rule (in both the project [CLAUDE.md](../CLAUDE.md) and the user's global guidelines): when documentation or code becomes obsolete, move it to `docs/archived/` or `file-archive/`. Never `rm`. Already enforced by an existing archive at [`docs/archived/`](../docs/archived/) with files dating back to early Phase 2.

## The pattern

Three commitments:

1. **No deletion without explicit user approval in chat.** Even when a doc is clearly wrong, the file gets moved, not removed.
2. **Timestamped archival.** Archived files get either a path prefix (`docs/archived/2026-04-15_setup.md`) or a frontmatter header (`ARCHIVED: 2026-04-15 / REASON: …`). Both forms appear in the existing archive.
3. **Forward link.** The replacement doc references the archived version if the history is load-bearing.

## Where it appears

- The repo-root [CLAUDE.md](../CLAUDE.md) — codifies the policy
- [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — restates it as cross-repo rule 10
- [`docs/archived/`](../docs/archived/) — populated archive

## Why it matters for this wiki

This wiki is itself going to generate stale pages. An entity gets refactored, a decision gets reversed, an incident becomes irrelevant. The temptation will be to delete. Don't. Move the page to `docs/wiki-mobile/archived/` (when that directory is needed) with the same frontmatter header, and update [[index]] with a deprecation note. This keeps the graph honest: future questions like "why did we ever do X?" stay answerable.

## Contradictions / tensions

- Archived pages still show up in graph view and in grep. That's a feature for audit, a noise problem for query. The mitigation is to prefix archived filenames so they sort to a known location.
- Linting (see [[SCHEMA#on-lint-wiki-lint]]) should treat archived pages as not-orphans even when nothing currently links to them, since their job is historical.

## See also

- [[SCHEMA]] — operational rules
- [[ORIGIN]] — why we keep history
