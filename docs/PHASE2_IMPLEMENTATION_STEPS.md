# Phase 2: Clerk Configuration - Manual Implementation Steps

**Current Status**: Demo mode enabled, waiting for real credentials
**Updated**: 2026-04-19

## What Phase 2 Requires

Phase 2 is the Clerk configuration step that sits between:
- **Phase 1** (Completed): GCP OAuth credentials created
- **Phase 2** (This): Configure Clerk to use those GCP credentials
- **Phase 3** (Next): Integrate components with Clerk authentication

## Current Project State

✅ **Already Complete**:
- Clerk package installed (`@clerk/clerk-expo`)
- Sign-in component created (`app/sign-in.tsx`)
- Sign-up component created (`app/sign-up.tsx`)
- Demo mode enabled for local development
- Auth context provider ready (`lib/auth-provider.tsx`)

⏳ **Waiting For**:
- Real Clerk API keys (Publishable + Secret)
- Real Google OAuth credentials from GCP
- Clerk instance created in Clerk Dashboard

## Step-by-Step Implementation

### Phase 2.1: Create or Access Clerk Account

**You need to**:
1. Go to https://dashboard.clerk.com
2. Sign up or sign in
3. Create a new Clerk instance (if you don't have one)
4. Note your Clerk instance name/ID

**Why**: Clerk provides the managed authentication service that acts as an intermediary between your app and Google OAuth.

### Phase 2.2: Configure Google OAuth in Clerk

**You need to**:
1. In Clerk Dashboard → **Settings** → **Social Connections**
2. Click **Google** to enable it
3. Fill in the GCP credentials from Phase 1:
   - Client ID: `...apps.googleusercontent.com`
   - Client Secret: `GOCSPX-...`
4. Save the configuration

**Why**: This tells Clerk which Google OAuth application to use for sign-in.

**File Changed**: None (this is all in Clerk's dashboard)

### Phase 2.3: Get Your Clerk API Keys

**You need to**:
1. In Clerk Dashboard, click **"Get Keys"** (usually top right)
2. Copy the two keys:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

**These are your unique credentials** that let your app talk to Clerk's servers.

### Phase 2.4: Update `.env.local` with Real Keys

**File to change**: `.env.local`

```bash
# Before (demo mode)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_demo_mode
CLERK_SECRET_KEY=sk_test_demo_mode

# After (with real keys from Clerk Dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_actual_key_from_dashboard
CLERK_SECRET_KEY=sk_test_actual_secret_from_dashboard
```

**Why**:
- Your app needs these to authenticate with Clerk's servers
- `NEXT_PUBLIC_` prefix means it's safe to expose in frontend code
- `CLERK_SECRET_KEY` is private and should never be in frontend

### Phase 2.5: Update Vercel Environment Variables

**You need to**:
```bash
# From project root
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# Paste your pk_test_ key

vercel env add CLERK_SECRET_KEY
# Paste your sk_test_ secret
```

**Why**: When you deploy to Vercel, it needs these credentials. Local development uses `.env.local`, but production uses Vercel's environment variable system.

### Phase 2.6: Verify Setup

**To check if Phase 2 is working**:

```bash
# 1. Check local credentials
grep "CLERK" .env.local
# Should show real keys, not "demo_mode"

# 2. Verify in Clerk Dashboard
# Settings → Social Connections → Google should show:
# - Status: Enabled ✅
# - Client ID & Secret saved ✅

# 3. After Phase 3 & 5 are done, test with:
curl http://localhost:3000/api/health/auth
# Should return { "clerk": true, ... }
```

## Current Demo Mode

The project is currently set up with demo credentials that allow testing without real Clerk keys. This is useful for development but won't work with real Google OAuth.

### To transition to real authentication:

1. **Get real GCP OAuth credentials** (Phase 1 - if not done)
   - From: https://console.cloud.google.com/apis/credentials?project=dfl-auth-25a
   - Creates: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

2. **Create Clerk account and instance** (Phase 2.1 - prerequisite)
   - Go to: https://dashboard.clerk.com
   - Creates: Your Clerk instance

3. **Configure Google OAuth in Clerk** (Phase 2.2-2.3)
   - Input GCP credentials into Clerk
   - Get Clerk API keys

4. **Update environment variables** (Phase 2.4-2.5)
   - Replace demo mode keys with real ones
   - Push to Vercel

5. **Test sign-in flow** (Phase 3 & onwards)
   - Should show "Sign in with Google" button
   - Should redirect to Google OAuth consent screen

## Timeline

**Phase 2 typically takes 10-15 minutes**:
- Creating Clerk instance: 2 min
- Configuring Google OAuth: 5 min
- Getting API keys: 1 min
- Updating environment variables: 5 min
- Verification: 2 min

## Deliverables Checklist

By end of Phase 2, you should have:

- ✅ Clerk account created
- ✅ Clerk instance set up
- ✅ Google OAuth enabled in Clerk Dashboard
- ✅ Clerk Publishable Key added to `.env.local` and Vercel
- ✅ Clerk Secret Key added to `.env.local` and Vercel
- ✅ All demo credentials replaced with real credentials
- ✅ Verified Clerk Dashboard shows enabled Google OAuth

## Common Questions

**Q: What's the difference between Phase 1 and Phase 2?**
- Phase 1: Create OAuth app in Google Cloud (GCP)
- Phase 2: Register that OAuth app with Clerk's system

**Q: Do I need a Clerk account before starting?**
- Yes, you need to sign up at https://dashboard.clerk.com

**Q: Is it safe to have Clerk keys in `.env.local`?**
- Yes, `.env.local` is in `.gitignore` so it never gets committed
- The Publishable Key is meant to be public
- The Secret Key should never be committed or exposed

**Q: Can I test without real credentials?**
- Yes! The project has demo mode enabled
- You can run the app locally without real keys
- Real Google OAuth sign-in requires real credentials

**Q: When should I do Phase 2?**
- After Phase 1 (GCP credentials ready)
- Before Phase 3 (component integration)

## Next Document

After completing Phase 2:
- Go to **Phase 3: Application Integration** to implement the sign-in/sign-up flow
- Or read **Phase 1 Summary** to verify Phase 1 is complete

## Files

- `.env.local` - Contains credentials (git-ignored)
- `.env.local.template` - Template with placeholder values
- Clerk Dashboard - https://dashboard.clerk.com (external)
- GCP Console - https://console.cloud.google.com (external)

---

**Status**: Ready for manual implementation
**Action Required**: Follow the step-by-step guide above
