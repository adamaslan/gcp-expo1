# Phase 2: Quick Checklist

Quick reference for Phase 2 implementation. Estimated time: **10-15 minutes**

## Prerequisites

- [ ] Phase 1 complete (GCP OAuth credentials obtained)
- [ ] Clerk account created at https://dashboard.clerk.com
- [ ] Admin access to Clerk Dashboard
- [ ] GCP Client ID and Client Secret ready

## Implementation Checklist

### 1. Enable Google OAuth in Clerk (5 min)

- [ ] Open https://dashboard.clerk.com
- [ ] Navigate to **Settings** → **Social Connections**
- [ ] Click **Google** to enable
- [ ] Paste GCP Client ID (from Phase 1)
- [ ] Paste GCP Client Secret (from Phase 1)
- [ ] Click **Save**

### 2. Get Clerk API Keys (1 min)

- [ ] Click **"Get Keys"** in Clerk Dashboard
- [ ] Copy **Publishable Key** (`pk_test_...`)
- [ ] Copy **Secret Key** (`sk_test_...`)

### 3. Update Local Environment (2 min)

```bash
# Edit .env.local with real keys
nano .env.local

# Replace these lines:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key
CLERK_SECRET_KEY=sk_test_your_actual_secret
```

- [ ] Updated `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] Updated `CLERK_SECRET_KEY`
- [ ] Saved `.env.local`

### 4. Update Vercel Environment (3 min)

```bash
# Push credentials to Vercel
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# Paste: pk_test_...

vercel env add CLERK_SECRET_KEY
# Paste: sk_test_...
```

- [ ] Added `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to Vercel
- [ ] Added `CLERK_SECRET_KEY` to Vercel

### 5. Verification (2 min)

```bash
# Verify local setup
grep "CLERK" .env.local

# Verify Vercel
vercel env ls

# Verify Clerk Dashboard
# Settings → Social Connections → Google shows Enabled ✅
```

- [ ] Local credentials verified (real keys, not demo mode)
- [ ] Vercel environment variables set
- [ ] Clerk Dashboard shows Google OAuth enabled
- [ ] No demo_mode in environment

## Security Checklist

- [ ] `.env.local` has real Clerk Publishable Key (starts with `pk_test_`)
- [ ] `.env.local` has real Clerk Secret Key (starts with `sk_test_`)
- [ ] `.env.local` is NOT committed to git (check `.gitignore`)
- [ ] Google OAuth credentials correctly entered in Clerk Dashboard
- [ ] No keys are hardcoded anywhere in source files

## Status

- [ ] **PHASE 2 COMPLETE**

## Common Issues

| Issue | Solution |
|-------|----------|
| "Can't find Clerk Dashboard" | Go to https://dashboard.clerk.com |
| "Google OAuth not appearing" | Check if Clerk instance selected, may need to refresh |
| "Keys not updating" | Restart dev server: `npm run dev` |
| "Vercel env not showing" | Might take 1-2 minutes to propagate, try `vercel env ls` again |
| "Still showing demo_mode" | Check `.env.local` wasn't overwritten, update it again |

## Next Phase

Once Phase 2 is complete:

```bash
# Continue to Phase 3: Component Integration
# Documentation: docs/PHASE3_COMPONENT_INTEGRATION.md
```

## Files Modified

- `.env.local` - Updated with real Clerk credentials
- Vercel Environment - Added Clerk variables
- No source code changes in Phase 2

---

**Time Estimate**: 10-15 minutes
**Complexity**: Low (mostly dashboard configuration)
**Risk**: Low (no code changes, just credentials)
