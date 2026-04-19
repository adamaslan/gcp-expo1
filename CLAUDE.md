# Project Documentation Policy

## Documentation Archival

**Never delete any documentation files.** When docs become outdated or superseded:

1. Move older docs to a `/docs/archived/` subfolder with a date prefix or descriptive suffix (e.g., `docs/archived/2026-04-19_old-setup-guide.md` or `docs/archived/deprecated_api_reference.md`)
2. Update the main docs to link to the archived version if needed for historical reference
3. Keep all archived docs in version control indefinitely

This ensures:
- Complete historical record of project decisions and implementations
- Ability to trace why things changed over time
- Reference material for understanding legacy code paths
- No loss of valuable context

**Example:**
- Current: `docs/setup.md`
- After update: `docs/setup.md` (updated) + `docs/archived/2026-04-15_setup.md` (old version)

---

# Phase 2: Clerk Configuration

## Overview

Phase 2 implements Clerk authentication configuration with Google OAuth integration.

## Current State

**Status**: Awaiting credential configuration
**Demo Mode**: Enabled (allows local testing without real credentials)

## What Phase 2 Does

1. **Configures Clerk Dashboard** with Google OAuth credentials from Phase 1
2. **Gets Clerk API Keys** (Publishable + Secret)
3. **Updates environment variables** with real credentials
4. **Enables sign-in with Google** OAuth flow

## Deliverables

- Clerk instance configured with Google OAuth
- Real Clerk API keys in `.env.local` and Vercel
- Google OAuth enabled in Clerk Dashboard
- Ready for component integration (Phase 3)

## Resources

- **Start Here**: [Phase 2 START HERE](./PHASE2_START_HERE.md) ← Start with this
- Quick Path: [Phase 2 Checklist](./docs/PHASE2_CHECKLIST.md) (10 min)
- Guided Path: [Phase 2 Implementation Steps](./docs/PHASE2_IMPLEMENTATION_STEPS.md) (15 min)
- Deep Dive: [Phase 2 Clerk Setup Guide](./docs/PHASE2_CLERK_SETUP.md) (30 min)
- Reference: [All Phases Guide](./ALL_PHASES_GUIDE.md#phase-2-clerk-configuration)
