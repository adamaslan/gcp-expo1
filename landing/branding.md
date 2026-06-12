# NuWrrrld Financial — Brand Guide

**Three keywords. Everything flows from them.**

> **Smart. Avant-garde. Caring.**

---

## The keywords, unpacked

### Smart
NuWrrrld Financial gives users a clear edge — not vague AI summaries but a structured decision workflow: market state → signal evidence → horizon conflict → actionable plan. Every copy line should be crisp, specific, and show the product knows what it's talking about. Smart means earning trust through precision.

- Use concrete numbers: "138 signals", "6 AI council agents", "1-hour session cap by architecture"
- Avoid hype words: "revolutionary", "game-changing", "next-gen"
- Tone: confident without being arrogant; sharp without being cold

### Avant-garde
NuWrrrld is ahead of the curve — tap-to-ask council instead of auto-burning tokens, a signal matrix instead of a single indicator, a Hold/Fold verdict instead of a raw chart. The product design is genuinely novel. Copy should reflect that without self-congratulation.

- Describe the architecture advantage matter-of-factly: "unit economics by design", "cost guard at the choke point"
- Lead with what's different, not what's familiar
- Tone: pioneering but grounded; forward-looking but honest about what exists today

### Caring
NuWrrrld treats the investor as someone who deserves clarity, not someone to overwhelm with noise. Caring shows in every error state, loading state, and confidence rating being visible. It shows in the 1-hour session cap (protecting the user from over-trading). It shows in the "Private by Design" promise.

- Write like you're on the user's side
- Acknowledge real investor anxieties: bad market months, noisy data, tool complexity
- Tone: warm and human; never condescending; never dismissive of risk

---

## Name and tagline

**Full name:** NuWrrrld Financial  
**Short form:** NuWrrrld (in conversational context, UI labels, app title bar)  
**Never use:** GCP Intelligence, GCP3, Signal Garden (internal dev names — do not surface)

**Primary tagline:** Smart · Avant-garde · Caring  
**Hero line options (pick one per page):**
- "Stop guessing. Start knowing." (index.html — accessible, direct)
- "138 signals. 380+ data points. 6 AI agents." (index2.html — technical credibility)
- "Give every market question a council, not just a chart." (index3.html — product promise)

**Sub-tagline in footer / secondary contexts:** Markets · Signals · Intelligence

---

## Voice and tone

| Context | Voice |
|---|---|
| Hero headline | Bold, direct, one strong claim |
| Body copy | Crisp, specific, no padding; one idea per sentence |
| Feature description | Functional-first ("Normalized ticker decisions"), benefit second |
| Error / empty states | Warm, plain English — never technical jargon at the surface |
| CTA buttons | Action-first, honest ("Create your account", not "Unlock the future") |
| Audience sections | Speak to the investor's real job-to-be-done, not their demographic |

**Active voice throughout.** "NuWrrrld Financial reasons across horizons" not "Horizons are reasoned across by NuWrrrld Financial."

---

## Colors (from the live CSS)

| Token | Hex | Use |
|---|---|---|
| `--green` | `#35d07f` | Primary CTA, positive signals |
| `--amber` | `#f4b83f` | Warm accents, caution states |
| `--blue` | `#4f7cff` | Indigo / secondary actions |
| `--cyan` | `#12c8d8` | Background glow, live data indicators |
| `--ink` | `#f7f3ea` | Primary text on dark |
| `--muted` | `#aba89e` | Secondary text |
| `--bg` | `#08090c` | Base background |
| `--panel-solid` | `#121419` | Card / surface background |

Brand gradient (logo mark, hero accents): `linear-gradient(135deg, #35d07f, #f4b83f)` — green-to-amber.

---

## Logo mark

Current: square mark with rounded corners, `NWF` initials (replaces the earlier "NW" mark and old "GCP" glyph), gradient fill `#35d07f → #f4b83f`, dark letterforms `#06100b`.

The mark lives at 34×34px in the topbar. At all sizes use initials "NWF"; in full contexts use the full name "NuWrrrld Financial". Full mark spec, size ramp, and the "Advanced AI-Native Financial Tools" category line live in `branding2.html` (Brand Book v2).

---

## CTAs

All primary CTAs must link to the live sign-up URL — no dead `href="#"` links:

```
https://accounts.nuwrrrld.com/sign-up
```

Secondary CTAs may link within the landing pages or to `https://financial.nuwrrrld.com`.

**CTA copy hierarchy:**
1. "Create your account" (primary, conversion)
2. "Open the app" (secondary, for returning users)
3. "See how it works" / "Explore the engine" (soft, for the curious)

Avoid: "Join the waitlist", "Request early access", "Get in touch" — these suggest the product isn't ready.

---

## What NOT to say

- ❌ "GCP Intelligence" / "GCP3" / "Signal Garden" (internal dev names)
- ❌ "v2", "Index2 introduced…", "This version shows…" (internal versioning language)
- ❌ "Compare with index2" (internal navigation)
- ❌ "Request early access" (implies a closed waitlist; the product is live)
- ❌ "Revolutionary" / "game-changing" / "disrupting" (hype without proof)
- ❌ "AI-powered" as a standalone claim (every product says this; say *what* the AI does)

---

## Application across pages

| File | Role | Brand emphasis |
|---|---|---|
| `index.html` | Consumer-facing overview, accessible entry point | Caring + Smart (emotional → rational) |
| `index2.html` | Technical depth, signal engine detail | Smart + Avant-garde (credibility first) |
| `index3.html` | Full product narrative, pipeline, council | All three — broadest audience |

All three pages now use the same Clerk sign-up URL for CTAs and the tagline "Smart · Avant-garde · Caring" in eyebrow / footer positions.

---

*Written 2026-06-12. Apply to the Expo app, nuwrrrld-portal, and any future marketing materials.*
