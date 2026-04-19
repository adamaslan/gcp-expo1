# Phase 1 Implementation: GCP OAuth Setup

## Status: ✅ PARTIALLY COMPLETE

This document tracks the completion of Phase 1 (GCP Setup). Some steps are automated, others require manual configuration via GCP Console.

---

## ✅ Completed Automated Steps

### 1. Project Configuration
- **GCP Project**: `REDACTED` (configured)
- **Account**: `chillcoders@gmail.com` (authenticated)
- **APIs Enabled**:
  - ✅ cloudresourcemanager.googleapis.com
  - ✅ serviceusage.googleapis.com
  - ✅ iap.googleapis.com

### 2. Service Account
- **Created**: `oauth-admin@REDACTED.iam.gserviceaccount.com`
- **Roles**: 
  - ✅ roles/iam.securityAdmin

### 3. Automation Scripts
- ✅ `scripts/setup-oauth.sh` - Full GCP setup automation
- ✅ `scripts/setup-vercel-env.sh` - Vercel environment configuration
- ✅ `.env.oauth.example` - Environment template

---

## ⚠️ Manual Steps Required (Next)

### Step 1: Configure OAuth Consent Screen

1. Go to **Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials/consent?project=REDACTED
   ```

2. Click **"Create Consent Screen"** or **"Edit App"**

3. Select **User Type**: "External" (allows any Google account)

4. Fill in App Information:
   - **App name**: Nuwrrrld
   - **User support email**: chillcoders@gmail.com
   - **Developer contact**: chillcoders@gmail.com

5. **Scopes** (Step 2):
   - Add scopes: `email`, `profile`, `openid`
   - These are required for user identification

6. **Test Users** (Step 3):
   - Add: chillcoders@gmail.com (your test account)
   - Add: any other testing accounts

7. **Summary** → Click "Save & Continue"

### Step 2: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**:
   ```
   https://console.cloud.google.com/apis/credentials?project=REDACTED
   ```

2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**

3. **Application Type**: Select "Web application"

4. **Name**: "Nuwrrrld OAuth Web Client"

5. **Authorized JavaScript origins** (where requests originate):
   - `http://localhost:3000`
   - `http://localhost:19006`
   - `https://YOUR_VERCEL_DOMAIN.vercel.app`
   - `https://clerk.accounts.com`

6. **Authorized redirect URIs** (callback URLs):
   ```
   http://localhost:3000/auth/callback/google
   http://localhost:19006/auth/callback/google
   https://YOUR_CLERK_INSTANCE.clerk.accounts.com/oauth/callback/google
   https://your-vercel-domain.vercel.app/auth/callback/google
   exp://your-mobile-app-id
   ```

7. Click **"Create"**

8. **Copy the credentials**:
   - Client ID: `XXXXXXXXXXX.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-XXXXXXXXXXXXXXX`

---

## 📋 How to Complete Phase 1

### Option A: Quick Setup (Recommended)

```bash
# 1. Open GCP Console
open "https://console.cloud.google.com/apis/credentials/consent?project=REDACTED"

# 2. Complete OAuth Consent Screen (2 min)
# → Fill app info, add scopes, save

# 3. Create OAuth 2.0 Client ID (2 min)
open "https://console.cloud.google.com/apis/credentials?project=REDACTED"
# → Click Create Credentials → OAuth 2.0 Client ID → Web Application

# 4. Copy credentials and save locally
# → Copy Client ID and Secret to .env.local

# 5. Setup Vercel environment
./scripts/setup-vercel-env.sh
```

### Option B: With Clerk Integration

If you need Clerk-specific redirect URIs:

```bash
# 1. Get your Clerk instance domain from dashboard.clerk.com
# Format: https://YOUR_INSTANCE.clerk.accounts.com

# 2. Use correct redirect URI in GCP:
# https://YOUR_INSTANCE.clerk.accounts.com/oauth/callback/google

# 3. Add to both:
# - Google OAuth credentials
# - Clerk Dashboard → Settings → Social Connections
```

---

## 🔐 Storing Credentials Securely

### Local Development

```bash
# Copy template
cp .env.oauth.example .env.local

# Edit with your credentials
nano .env.local  # or use your editor

# File should contain:
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_KEY
CLERK_SECRET_KEY=YOUR_CLERK_SECRET
```

### Production (Vercel)

```bash
# Use the provided script
./scripts/setup-vercel-env.sh

# Or manually with vercel CLI:
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID
# → Paste: YOUR_CLIENT_ID_HERE
# → Select: Production, Preview, Development

vercel env add GOOGLE_CLIENT_SECRET
# → Paste: YOUR_CLIENT_SECRET_HERE
# → Select: Production, Preview, Development (ONLY)

# Verify setup
vercel env ls
```

---

## ✅ Verification Checklist

- [ ] OAuth Consent Screen created
- [ ] OAuth 2.0 Client ID created
- [ ] Client ID copied: `_________________________`
- [ ] Client Secret copied: `_________________________`
- [ ] Clerk instance domain known: `_________________________`
- [ ] Vercel domain known: `_________________________`
- [ ] `.env.local` configured
- [ ] Vercel environment variables set
- [ ] `vercel env ls` shows all 4 variables

---

## 🔗 Redirect URIs Checklist

Use this template. Replace placeholders with your actual values:

```
CLERK_INSTANCE = YOUR_INSTANCE.clerk.accounts.com
VERCEL_DOMAIN = your-app-name.vercel.app
EXPO_APP_ID = expo://your-app-id
```

**In GCP OAuth Consent Screen:**
- [ ] App Name: Nuwrrrld
- [ ] Scopes: email, profile, openid
- [ ] Test User: chillcoders@gmail.com

**In GCP OAuth 2.0 Client ID (Web Application):**
- [ ] JavaScript Origins:
  - [ ] http://localhost:3000
  - [ ] http://localhost:19006
  - [ ] https://CLERK_INSTANCE (without /oauth/callback)
  - [ ] https://VERCEL_DOMAIN

- [ ] Redirect URIs:
  - [ ] http://localhost:3000/auth/callback/google
  - [ ] http://localhost:19006/auth/callback/google
  - [ ] https://CLERK_INSTANCE/oauth/callback/google
  - [ ] https://VERCEL_DOMAIN/auth/callback/google
  - [ ] exp://EXPO_APP_ID

---

## 🚀 Next Phase

Once Phase 1 is complete with verified credentials:

1. Proceed to **Phase 2: Clerk Configuration**
   - Enable Google OAuth in Clerk Dashboard
   - Paste GCP credentials into Clerk

2. Test locally:
   ```bash
   npm run dev
   # Try Google sign-in flow
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

---

## 🔧 Troubleshooting

### "Redirect URI mismatch" error
- **Cause**: URI in GCP doesn't match actual callback URL
- **Fix**: Verify all redirect URIs in GCP exactly match your app URLs

### "Invalid Client" error
- **Cause**: Wrong Client ID or Client Secret
- **Fix**: Check credentials are correct and environment variables are set

### "OAuth consent screen not configured"
- **Cause**: Haven't completed OAuth Consent Screen step
- **Fix**: Complete Step 1 above (takes 2 minutes)

### "Test users only" error
- **Cause**: OAuth app is in development, user not added as test user
- **Fix**: Add yourself as test user in OAuth Consent Screen

---

## 📚 References

- **GCP OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **GCP Credentials**: https://console.cloud.google.com/apis/credentials?project=REDACTED
- **Clerk Docs**: https://clerk.com/docs/authentication/social-connections/google
- **Vercel Env Vars**: https://vercel.com/docs/projects/environment-variables

---

## Status Summary

```
Phase 1: GCP OAuth Setup
├─ ✅ GCP Project Setup (REDACTED)
├─ ✅ APIs Enabled (OAuth2, Resource Manager, Service Usage)
├─ ✅ Service Account Created (oauth-admin)
├─ ✅ IAM Roles Configured
├─ ✅ Automation Scripts Created
├─ ⏳ OAuth Consent Screen (Manual - 2 min)
├─ ⏳ OAuth 2.0 Client ID (Manual - 2 min)
├─ ⏳ Environment Variables Setup (Manual - 2 min)
└─ ⏳ Verification (1 min)

Total Time Remaining: ~7 minutes
```

---

## Commands Reference

```bash
# View GCP Project info
gcloud projects describe REDACTED

# View enabled APIs
gcloud services list --enabled

# View service accounts
gcloud iam service-accounts list

# View IAM roles
gcloud projects get-iam-policy REDACTED

# Setup Vercel env vars
./scripts/setup-vercel-env.sh

# Verify Vercel vars are set
vercel env ls

# Test locally
npm run dev

# Deploy to Vercel
vercel --prod
```
