# Phase 2: Clerk Configuration Guide

**Status**: Implementation started
**Date**: 2026-04-19

## Overview

Phase 2 configures Clerk authentication service with Google OAuth integration. This enables social sign-in across your mobile and web applications.

## Prerequisites Checklist

- [ ] Clerk account created at https://dashboard.clerk.com
- [ ] GCP OAuth credentials from Phase 1 (Client ID & Secret)
- [ ] Clerk instance already created (check dashboard)
- [ ] Admin access to Clerk dashboard

## Steps to Complete

### Step 1: Access Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Sign in with your account
3. Select your Clerk instance (or create one if not exists)

### Step 2: Enable Google OAuth in Clerk

1. In Clerk Dashboard, navigate to **Settings** → **Social Connections**
2. Find **Google** in the provider list
3. Click the toggle to **Enable** Google
4. Paste your GCP OAuth credentials:
   - **Client ID**: `XXXXXXXXX.apps.googleusercontent.com` (from Phase 1)
   - **Client Secret**: `GOCSPX-XXXXXXXXX` (from Phase 1)
5. Click **Save**

### Step 3: Verify OAuth Scopes

In Clerk Dashboard → **Settings** → **Social Connections** → **Google**:

Ensure these scopes are enabled:
- ✅ `email` - User's email address
- ✅ `profile` - User's profile information (name, picture, etc.)
- ✅ `openid` - OpenID Connect identifier

These should be auto-configured by Clerk.

### Step 4: Configure Redirect URLs

Clerk should auto-configure redirect URIs. Verify these are present:

**For Web/Expo:**
```
http://localhost:3000/auth/callback/google
http://localhost:19006/auth/callback/google
```

**For Vercel Production:**
```
https://your-vercel-domain.vercel.app/auth/callback/google
```

**For Clerk Managed Domain:**
```
https://YOUR_CLERK_INSTANCE.clerk.accounts.com/oauth/callback/google
```

### Step 5: Get Your Clerk API Keys

1. In Clerk Dashboard, click **"Get Keys"** button (top right)
2. Copy both keys:
   - **Publishable Key**: `pk_test_...` (safe to expose in frontend)
   - **Secret Key**: `sk_test_...` (NEVER expose in frontend)

### Step 6: Update Local Environment

Update `.env.local` with your Clerk keys:

```bash
# Replace these with your actual values
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key
CLERK_SECRET_KEY=sk_test_your_actual_secret
```

**Do NOT commit `.env.local` to git** - it's already in `.gitignore`.

### Step 7: Update Vercel Environment Variables

Push your Clerk credentials to Vercel:

```bash
# From project root
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# Paste: pk_test_your_actual_key

vercel env add CLERK_SECRET_KEY
# Paste: sk_test_your_actual_secret
```

Verify they're set:
```bash
vercel env ls
```

## Verification Checklist

After completing all steps, run these verifications:

### Local Verification

```bash
# Check credentials are loaded
grep "CLERK" .env.local

# Should show:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
```

### Dashboard Verification

1. Open Clerk Dashboard
2. Verify **Settings** → **Social Connections** → **Google** shows:
   - ✅ Google is **Enabled**
   - ✅ Client ID & Secret are saved
   - ✅ Scopes: `email`, `profile`, `openid`

### Runtime Verification

After deploying (Phase 5), test the health check:

```bash
# Development
curl http://localhost:3000/api/health/auth

# Production
curl https://your-app.vercel.app/api/health/auth

# Expected response:
# {
#   "clerk": true,
#   "google_oauth": true,
#   "timestamp": "2026-04-19T..."
# }
```

## Troubleshooting

### "Clerk not initialized"
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in `.env.local`
- Check `.env.local` is in root directory
- Restart dev server: `npm run dev`

### "Google OAuth not showing"
- Verify Google is enabled in Clerk Dashboard
- Check Client ID & Secret are correct
- Clear browser cookies and refresh

### "Redirect URI mismatch"
- Verify redirect URIs match your app URLs exactly (case-sensitive)
- For local dev: use `http://localhost:3000`
- For Vercel: use your actual Vercel domain

### "Session creation fails"
- Check `CLERK_SECRET_KEY` is set correctly (NOT in frontend)
- Verify Clerk webhook is configured (Phase 5)
- Check Vercel logs: `vercel logs --follow`

## Next Steps

Once Phase 2 is complete:

1. **Phase 3**: Integrate enhanced sign-in/sign-up components
2. **Phase 4**: Add resilience patterns (retry, rate limiting, logging)
3. **Phase 5**: Deploy and monitor in production

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env.local` to git (already in `.gitignore`)
- Never expose `CLERK_SECRET_KEY` in frontend code
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is safe to expose in frontend
- Rotate keys if you suspect compromise
- Use different keys for dev/staging/production

## Files Modified

- `.env.local` - Updated with Clerk keys
- Vercel environment - Added Clerk variables

## Status Tracking

- [ ] Step 1: Accessed Clerk Dashboard
- [ ] Step 2: Enabled Google OAuth
- [ ] Step 3: Verified OAuth Scopes
- [ ] Step 4: Configured Redirect URLs
- [ ] Step 5: Got Clerk API Keys
- [ ] Step 6: Updated `.env.local`
- [ ] Step 7: Updated Vercel environment
- [ ] Verification: Local check passed
- [ ] Verification: Dashboard check passed
- [ ] **PHASE 2 COMPLETE**

---

**Next**: [Phase 3: Application Integration](./PHASE3_COMPONENT_INTEGRATION.md)
