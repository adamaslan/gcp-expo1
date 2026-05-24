# Production Clerk Setup

How to move the mobile app from development Clerk keys (`pk_test_…` / `sk_test_…`) to production keys (`pk_live_…` / `sk_live_…`) when you're ready to ship.

> **Status:** Development keys are intentionally still in [.env.local](../.env.local) — this is correct for local Expo Go testing. Don't swap them until you're ready to release a TestFlight / production build. See [[wiki-mobile/decision-demo-mode-default-on]].

---

## Why this doc exists

The warning you see in Expo logs:

```
WARN  Clerk: Clerk has been loaded with development keys. Development instances
have strict usage limits and should not be used when deploying your application
to production.
```

…is Clerk telling you `pk_test_…` keys work, but cap at:
- 100 monthly active users
- Shared dev OAuth credentials (one Google app, one Apple app — not yours)
- No custom domain
- Rate limits significantly tighter than prod

These limits are fine for local dev and demos. They are NOT fine for users on real devices via App Store / TestFlight.

---

## What "going to production" actually means

Five distinct things, in roughly this order. None of them happen in app code; most are Clerk Dashboard + your DNS + a one-line env swap.

| Step | Where | Time | Code change? |
|---|---|---|---|
| 1. Create production instance | dashboard.clerk.com | 2 min | No |
| 2. Configure OAuth providers with YOUR credentials | Google Cloud Console + Clerk Dashboard | 15 min | No |
| 3. Set up custom domain (optional but recommended) | Clerk Dashboard + your DNS | 30 min | No |
| 4. Generate `pk_live_` / `sk_live_` keys | Clerk Dashboard | 1 min | No |
| 5. Swap env vars in EAS / production builds | EAS secrets | 5 min | Yes (env only) |

---

## Step 1 — Create a production instance

Clerk separates "development instances" (your current `pk_test_YWRhcHRpbmctY29uZG9yLTk5…`) from "production instances" (a separate environment with its own keys and its own user pool).

1. Go to https://dashboard.clerk.com
2. In the top-left selector, click your current instance → **"Create application"** OR find an existing production app
3. Choose **"Production"** as the environment type
4. Name it something distinguishable from your dev instance (e.g. `gcp3-mobile-prod`)
5. Pick the same auth providers you have in dev (Google, email/password, etc.)

You now have a separate Clerk app with its own user database. Test users created in your dev instance do NOT carry over — this is by design.

---

## Step 2 — Configure OAuth with your own credentials

Production instances do NOT use Clerk's shared OAuth credentials. You must provide your own. For Google (the only OAuth provider this app uses):

### 2a. Get a Google OAuth Client ID + Secret

1. Go to https://console.cloud.google.com/apis/credentials
2. Pick the GCP project this app belongs to (likely `dfl-auth-25a` per [.env.local.template](../.env.local.template) — but check)
3. **Create credentials → OAuth Client ID → Web application** (not iOS/Android even though this is a mobile app — Clerk handles the mobile redirect itself)
4. Add the redirect URI Clerk shows you in its dashboard for the production instance. It looks like:
   ```
   https://clerk.<your-prod-domain>.com/v1/oauth_callback
   ```
   If you skip Step 3 (custom domain), the URI is `https://<prod-instance-name>.clerk.accounts.dev/v1/oauth_callback`.
5. Copy the **Client ID** and **Client Secret** that Google shows you.

### 2b. Paste them into the Clerk Dashboard

1. In Clerk Dashboard → your production instance → **User & Authentication → Social Connections → Google**
2. Toggle **"Use custom credentials"**
3. Paste the **Client ID** and **Client Secret**
4. Save.

Now sign-ins on the production instance use your Google app, not Clerk's shared one.

---

## Step 3 — Custom domain (optional, do this if you want a polished sign-in)

Without a custom domain, your prod Clerk URLs look like `something-prod.clerk.accounts.dev` — fine for a hidden API but ugly on a hosted sign-in page if you ever expose one.

1. Clerk Dashboard → your production instance → **Domains**
2. Add your domain (e.g. `nuwrrrld.com` per [docs/MULTI_BACKEND_INTEGRATION.md](MULTI_BACKEND_INTEGRATION.md))
3. Clerk gives you 5 DNS records (CNAMEs for `clerk.`, `clk._domainkey.`, etc.)
4. Add them to your DNS provider (likely Vercel or Cloudflare given the rest of the stack)
5. Wait for verification (usually under 30 minutes, can take a few hours)

If you skip this, everything still works — links just have the `*.clerk.accounts.dev` host.

---

## Step 4 — Grab the production keys

1. Clerk Dashboard → your production instance → **API Keys** → **Show**
2. Copy:
   - **Publishable key** — starts with `pk_live_…`
   - **Secret key** — starts with `sk_live_…`

Treat the secret key like a database password. Don't paste it into chat, screenshots, commits, or `.env.local` files that get pushed.

---

## Step 5 — Wire the keys into production builds

You do NOT swap these into [.env.local](../.env.local) — that file is for local dev only. Production builds get their env from EAS secrets.

### EAS secrets setup

```bash
# Set the publishable key (visible at runtime — that's why it's "publishable")
eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_xxx

# Set the secret key — only needed if you ship a server component that verifies tokens server-side
# For an Expo client-only app, you may not need this at all
eas secret:create --scope project --name CLERK_SECRET_KEY --value sk_live_xxx
```

If you don't have EAS configured yet, run:
```bash
eas login
eas build:configure
```

### eas.json build profile

The production profile in `eas.json` should look like (create one if it doesn't exist):

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_DEMO_MODE": "false"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_DEMO_MODE": "false"
      }
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  }
}
```

The `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` env var resolves from the EAS secret automatically because it has the `EXPO_PUBLIC_` prefix.

### Production build command

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## Step 6 — Verify after deploy

After the production build is on a device:

1. Open the app — the dev-keys warning should be gone from logs
2. Sign in with Google — should hit YOUR Google OAuth consent screen (your app icon/name), not Clerk's generic one
3. Check the Clerk Dashboard → production instance → Users — your test sign-in should appear there, NOT in the dev instance

If any of those fail, the env var didn't propagate. Re-run `eas secret:list` to confirm the secret is set, and `eas build --profile production` again.

---

## Session lifetime (1-hour cap)

The app enforces a 1-hour session cap **client-side** in [App.tsx](../App.tsx) via `SESSION_MAX_AGE_MS`. This kicks the user back to [SignInScreen.tsx](../screens/SignInScreen.tsx) after 60 minutes regardless of what Clerk says.

For defense-in-depth — and to also expire the Clerk-issued JWT server-side so any cached backend calls fail closed — set the matching value in the Clerk Dashboard:

1. Clerk Dashboard → your instance → **Sessions**
2. **Token lifetime** → set to `3600` seconds (1 hour)
3. **Inactivity timeout** → leave at default (Clerk recommends 7 days; the client-side cap supersedes this)
4. **Multi-session handling** → leave at default

Apply this to both the development AND production instances — the client-side cap is the same in both, so the server should agree.

### Why both client AND server?

- **Client-side cap** (current `App.tsx` logic): UX guarantee. The user actually sees the sign-in screen at 60 min. Doesn't depend on network or Clerk's response.
- **Server-side cap** (Dashboard setting): Security guarantee. Even if the client clock is wrong or someone bypasses the client check, the JWT stops verifying after 60 min.

Without the server-side setting, a tampered client could keep using the same token past 1 hour. Without the client-side setting, the UI looks broken (calls fail with 401, but the screen still shows the tabs).

---

## Common pitfalls

- **"I changed the key but still see the warning"** → Expo caches env at build time. The `--clear` flag on `expo start` clears Metro cache but EAS builds bake env into the bundle. You need a new build for env changes to take effect.
- **"My dev users aren't in production"** → Correct. Production is a separate user pool. There's no migration path that's not a manual `users:export` / `users:import`.
- **"OAuth says 'redirect_uri_mismatch'"** → The redirect URI you put in Google Cloud Console doesn't match what Clerk is sending. Compare them character-by-character — trailing slashes matter.
- **"The Council / backend calls now fail with 401"** → If you've also added JWT verification to the backends, the prod Clerk JWT has different issuer/audience claims than the dev one. Backend needs to know the prod issuer URL.

---

## What about `@clerk/mcp-tools`?

Just installed via [package.json](../package.json). This is a **separate concern from going to production** — it's a toolkit for building MCP servers that authenticate users via Clerk. Not used yet in this app. We'll wire it up when we have a concrete need (e.g. exposing a tool surface for AI agents to call gcp3 on a user's behalf). For now it sits in `node_modules` waiting.

If/when you want to use it, the entry points are documented at https://github.com/clerk/mcp-tools.

---

## Related

- [Clerk Dashboard](https://dashboard.clerk.com)
- [Clerk: Deploying to production](https://clerk.com/docs/deployments/overview)
- [docs/PHASE2_CLERK_SETUP.md](PHASE2_CLERK_SETUP.md) — original dev-instance setup
- [docs/wiki-mobile/entity-clerk-expo.md](wiki-mobile/entity-clerk-expo.md) — entity page for the Clerk integration
- [docs/wiki-mobile/decision-demo-mode-default-on.md](wiki-mobile/decision-demo-mode-default-on.md) — why dev keys remain in `.env.local`
