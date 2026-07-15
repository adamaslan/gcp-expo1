---
date: 2026-07-15
type: decision
tags: [ui, theme, dark-mode, mobile, portal-parity]
sources: [lib/ui/theme.ts, screens/]
---

# Decision: Adopt portal-aligned neon dark theme palette

## Decision
Replace the indigo-based dark palette in `lib/ui/theme.ts` with a cyan-neon dark palette (`#2fd8ff` accent, `#06070d` base) that matches the `nuwrrrld-portal` web app.

## Date
2026-07-15 (PR #27)

## Context
The mobile app's original `lib/ui/theme.ts` used an indigo-dominant palette (`#6366f1` accent, `#0a0a0f` base, `indigoDeep`, `#22d3ee` cyan). The web portal had evolved to a distinct neon-cyan identity (`#2fd8ff`, richer dark backgrounds). While both apps were "dark mode", they did not look like the same product — the mobile palette read as "indigo fintech" and the portal read as "neon terminal." Users switching between web and mobile perceived two separate visual languages.

## Alternatives considered

- **Keep both palettes separate** — rejected because NuWrrrld Financial is a unified brand. Sign-in, onboarding, and home screens are the highest-visibility product surfaces; divergence here is prominent.
- **Unify on the old indigo palette** — rejected because the portal's neon-cyan palette had stronger brand differentiation and was already in production on the web.
- **CSS variables / design token sync via build step** — considered but out of scope; the correct long-term path but requires cross-repo tooling not yet in place.

## Consequences

**Enables:**
- Visual parity between `gcp3-mobile` and `nuwrrrld-portal` for shared brand surfaces (sign-in, home, signals digest)
- Single color vocabulary for design reviews and bug reports

**Rules out / requires maintenance:**
- `theme.accent.indigoDeep` removed — any future screen using it must use `theme.accent.indigo` instead
- `theme.bg.base` is now `#06070d` (was `#0a0a0f`) — very similar but not identical; screenshots from before PR #27 will show a marginally different background
- `theme.accent.cyan` and `theme.accent.blue` are now the same value (`#2fd8ff`) — this is intentional; older code using `theme.accent.cyan` continues to work

**Open question:**
> ❓ Open question: Should `lib/ui/theme.ts` be extracted into a shared package (`@nuwrrrld/tokens`) so portal and mobile stay in sync at build time rather than by copy-paste convention?

## Validated by
PR #27 — visual review on simulator confirmed neon-cyan accent renders correctly on `#06070d` dark background across all five updated screens.

## See also
- [[entity-nuai]] — NuAI screen is one of the updated surfaces
- [[entity-signals-digest]] — DigestScreen updated; degraded banner now amber-on-dark
- [[entity-billing]] — SignInScreen updated (minor errorBox rgba fix)
- [[concept-archive-not-delete]]
