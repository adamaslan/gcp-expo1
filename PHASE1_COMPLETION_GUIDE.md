# Phase 1 Completion Guide - Step by Step

## 🎯 Current Status
✅ **Automated Setup**: Complete
⏳ **Manual Configuration**: Pending (5 minutes)

---

## Step 1: Configure OAuth Consent Screen (2 minutes)

### Open GCP Console
Click this link or copy to browser:
```
https://console.cloud.google.com/apis/credentials/consent?project=REDACTED
```

### Fill in the form:

**Step 1 - App Information**
- **User Type**: Select "External" (allows any Google user)
- **App name**: `Nuwrrrld`
- **User support email**: `chillcoders@gmail.com`
- **Developer contact information**:
  - Email: `chillcoders@gmail.com`

Click **"Save and Continue"**

---

**Step 2 - Scopes**
- Click **"Add or Remove Scopes"**
- Search for and select:
  - ✅ `email` (Provides email address)
  - ✅ `profile` (Provides name and profile info)
  - ✅ `openid` (OpenID Connect - for JWT tokens)

Click **"Update"** then **"Save and Continue"**

---

**Step 3 - Test Users**
- Click **"Add Users"**
- Add email: `chillcoders@gmail.com`
- Add any other test accounts if needed

Click **"Save and Continue"**

---

**Step 4 - Summary**
- Review all information
- Click **"Back to Dashboard"**

✅ **OAuth Consent Screen: Complete**

---

## Step 2: Create OAuth 2.0 Client ID (2 minutes)

### Open Credentials Page
```
https://console.cloud.google.com/apis/credentials?project=REDACTED
```

### Create New Credential

1. Click blue **"+ Create Credentials"** button (top left)
2. Select **"OAuth client ID"**
3. Choose **Application type**: "Web application"
4. Set **Name**: `Nuwrrrld OAuth Web Client`

### Configure Authorized Origins

Under **"Authorized JavaScript origins"**, add:
```
http://localhost:3000
http://localhost:19006
```

### Configure Authorized Redirect URIs

Under **"Authorized redirect URIs"**, add all of these:

```
http://localhost:3000/auth/callback/google
http://localhost:19006/auth/callback/google
```

**Also add these (update placeholders):**

For Clerk (find your instance at dashboard.clerk.com):
```
https://YOUR_CLERK_INSTANCE.clerk.accounts.com/oauth/callback/google
```

For Vercel production (replace with your actual Vercel domain):
```
https://your-app-name.vercel.app/auth/callback/google
```

For Expo (if using mobile):
```
exp://your-expo-app-id
```

### Save and Copy Credentials

1. Click **"Create"**
2. A popup shows your credentials:
   - **Client ID**: `xxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxx`

**Copy both values - you'll need them next**

✅ **OAuth 2.0 Client ID: Complete**

---

## Step 3: Save Credentials Locally (1 minute)

### Create .env.local file

```bash
# In your project root directory
cp .env.oauth.example .env.local
```

### Edit .env.local

Open `.env.local` in your editor and fill in:

```bash
# From Google Cloud Console (just created)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE

# From Clerk Dashboard (https://dashboard.clerk.com)
# → Copy from Dashboard page
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# For Expo (optional, can use same as NEXT_PUBLIC_GOOGLE_CLIENT_ID)
EXPO_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

**Save the file**

✅ **Local Credentials: Complete**

---

## Step 4: Setup Vercel Environment Variables (1 minute)

### Run Setup Script

```bash
./scripts/setup-vercel-env.sh
```

This will prompt you to add each variable to Vercel.

### Or Add Manually

```bash
# Add Client ID (public, can be in browser)
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID
# → Paste: YOUR_CLIENT_ID_HERE
# → Select: Production, Preview, Development

# Add Client Secret (secret, server-only)
vercel env add GOOGLE_CLIENT_SECRET
# → Paste: YOUR_CLIENT_SECRET_HERE
# → Select: Production, Preview, Development (with secret checkbox)

# Add Clerk keys
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# → Paste your Clerk publishable key

vercel env add CLERK_SECRET_KEY
# → Paste your Clerk secret key
```

### Verify Variables

```bash
vercel env ls
```

You should see:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

✅ **Vercel Environment: Complete**

---

## Step 5: Verify Everything (1 minute)

### Run Verification Script

```bash
./scripts/check-phase1.sh
```

Look for these checkmarks:
- ✅ GCP Project set correctly
- ✅ Required APIs enabled
- ✅ oauth-admin service account exists
- ✅ Configuration files exist
- ✅ Vercel CLI installed
- ✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID set in Vercel
- ✅ GOOGLE_CLIENT_SECRET set in Vercel
- ✅ @clerk/clerk-expo installed

### Test Locally

```bash
npm run dev
```

Visit `http://localhost:3000` or `http://localhost:19006` (Expo Web)

Try signing in with Google - it should work!

---

## ✅ Phase 1 Complete!

### What You've Done:
1. ✅ Configured GCP Project (`REDACTED`)
2. ✅ Enabled required APIs
3. ✅ Created OAuth service account
4. ✅ Setup OAuth Consent Screen
5. ✅ Created OAuth 2.0 Client Credentials
6. ✅ Stored credentials locally and in Vercel
7. ✅ Verified all configurations

### What's Ready:
- Google OAuth working locally
- Credentials secured in Vercel
- Clerk configured for OAuth
- Ready for Phase 2 (Clerk Configuration)

---

## 🐛 Troubleshooting

### "Invalid redirect_uri"
**Problem**: Redirect URL doesn't match what's in GCP
**Solution**: 
1. Check exact URL in browser address bar
2. Add that URL to GCP OAuth 2.0 Client ID → Authorized redirect URIs
3. Wait 5 minutes for GCP to propagate

### "OAuth app not configured"
**Problem**: Haven't completed OAuth Consent Screen
**Solution**: Complete Step 1 above

### "Client ID mismatch"
**Problem**: Using wrong Client ID
**Solution**: Copy exact Client ID from GCP Console

### "Vercel variables not found"
**Problem**: Variables not set in Vercel
**Solution**: Run `./scripts/setup-vercel-env.sh` or manually add with `vercel env add`

### "Localhost not working"
**Problem**: Using production OAuth Client ID
**Solution**: Use `http://localhost:3000` in GCP Authorized JavaScript origins

---

## 📋 Checklist - Mark as You Go

- [ ] OAuth Consent Screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Client ID copied: `________________`
- [ ] Client Secret copied: `________________`
- [ ] .env.local created and filled
- [ ] Vercel env vars added
- [ ] `vercel env ls` shows all 4 variables
- [ ] `./scripts/check-phase1.sh` all green
- [ ] Tested locally with `npm run dev`

---

## 🎬 Next: Phase 2

Once Phase 1 is complete, proceed to **Phase 2: Clerk Configuration**

This involves:
1. Enable Google OAuth in Clerk Dashboard
2. Add GCP credentials to Clerk
3. Configure sign-in/sign-up components
4. Test full auth flow

---

## 📞 Need Help?

- **GCP Docs**: https://developers.google.com/identity/protocols/oauth2
- **Clerk Docs**: https://clerk.com/docs/authentication/social-connections/google
- **Vercel Docs**: https://vercel.com/docs/projects/environment-variables

Check the main auth robustness guide:
```
AUTH_ROBUSTNESS_GUIDE.md
```
