# Phase 3: Testing Guide - Sign-In/Sign-Up Flow

**Last Updated**: 2026-04-19  
**Status**: ✅ Dev Server Running & Ready for Testing

---

## Quick Start

### 1. Start the Dev Server
```bash
cd /Users/adamaslan/code/gcp3-mobile
npm run web
```

**You'll see:**
```
Logs will appear in the browser console
```

**Server running at:** `http://localhost:8081`

---

## Manual Testing (Browser)

### Step 1: Open in Browser
- Desktop: http://localhost:8081
- iOS Simulator: http://localhost:8081
- Android Emulator: http://localhost:8081

### Step 2: Verify Sign-In Screen
You should see:
- ✅ "Phase 3: Auth Setup" heading
- ✅ "Clerk Configuration" card showing status
- ✅ "Google OAuth sign-in" button (visible in SignInScreen)

### Step 3: Test Google Sign-In
**Prerequisites (Phase 2):**
- ✅ Clerk account created
- ✅ Google OAuth enabled in Clerk Dashboard
- ✅ Real Clerk credentials in `.env.local`

**To Test:**
1. Click "Sign in with Google" button
2. Authenticate with your Google account (chillcoders@gmail.com recommended)
3. Should be redirected to HomeScreen

**Expected Result on HomeScreen:**
```
👋 Welcome!

Email: your-email@example.com
Name: Your Name
Connected Providers: ✓ google
Account Status: ✅ Authenticated
```

### Step 4: Test Sign-Out
1. Scroll down on HomeScreen
2. Tap "Sign Out" button
3. Should return to Sign-In screen

---

## Testing Checklist

- [ ] Dev server starts without errors
- [ ] Can navigate to http://localhost:8081
- [ ] Sign-In screen displays
- [ ] Google OAuth button is visible
- [ ] Can initiate Google sign-in flow
- [ ] After sign-in: HomeScreen shows with user profile
- [ ] Email displays correctly
- [ ] Name displays correctly (if available from Google)
- [ ] "Connected Providers" shows Google
- [ ] Account status shows "✅ Authenticated"
- [ ] Sign-Out button works
- [ ] After sign-out: returns to Sign-In screen
- [ ] Session persists after page refresh (stored in SecureStore)

---

## What Each Component Does

### [SignInScreen.tsx](./screens/SignInScreen.tsx)
**Purpose:** Authenticate user via Google OAuth

**Features:**
- ✅ Google sign-in button
- ✅ Loading indicator during auth
- ✅ Error message display
- ✅ Demo mode text (informational)

**Components Used:**
- `useSignIn()` - Clerk hook for sign-in logic
- `useOAuth()` - Clerk hook for Google OAuth flow
- `startOAuthFlow()` - Initiates Google authentication
- `expo-web-browser` - Handles OAuth redirect

### [HomeScreen.tsx](./screens/HomeScreen.tsx)
**Purpose:** Display authenticated user information

**Features:**
- ✅ User profile display
- ✅ Connected providers list
- ✅ Account status indicator
- ✅ Sign-out button

**Components Used:**
- `useUser()` - Gets current authenticated user
- `useClerk()` - Clerk context for sign-out
- User data display (email, firstName, lastName)
- External accounts enumeration

### [App.tsx](./App.tsx)
**Purpose:** Root provider setup

**Features:**
- ✅ ClerkProvider configuration
- ✅ SecureStore token cache
- ✅ Signed-in/Signed-out conditional rendering
- ✅ Environment variable validation

---

## Environment Variables Loaded

From `.env.local`:
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_adapting-condor-99.clerk.accounts.dev$
CLERK_SECRET_KEY=sk_test_3xtywDPEemd3qo7z0MrFfn5HGw8ozU15b2DU3sRt3f
NEXT_PUBLIC_DEMO_MODE=true
```

**Verify:** Check browser console for:
```
[web] Logs will appear in the browser console
```

---

## Common Issues & Solutions

### Issue: "Missing Publishable Key"
**Cause:** `.env.local` not loaded or missing value  
**Solution:**
```bash
# Check file exists
ls -la .env.local

# Verify it has the key
grep EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY .env.local
```

### Issue: Google Sign-In Doesn't Start
**Cause:** Google OAuth not enabled in Clerk Dashboard  
**Solution:** Complete Phase 2 (Clerk Configuration)
- Go to https://dashboard.clerk.com
- Settings → Social Connections
- Enable Google OAuth
- Add GCP credentials from Phase 1

### Issue: "Session creation failed"
**Cause:** Clerk credentials incorrect or Google OAuth not properly configured  
**Solution:**
1. Verify Clerk keys are valid (`pk_test_` and `sk_test_`)
2. Check Clerk Dashboard shows Google OAuth enabled
3. Verify GCP project has correct OAuth credentials

### Issue: Dev Server Won't Start
**Cause:** Port 8081 in use or build error  
**Solution:**
```bash
# Kill existing process
lsof -ti:8081 | xargs kill -9

# Clear cache
rm -rf .expo

# Reinstall deps
npm install --legacy-peer-deps

# Try again
npm run web
```

---

## Testing Different Scenarios

### Scenario 1: First-Time Sign-In
1. Start fresh with no cookies
2. Click "Sign in with Google"
3. User account created automatically in Clerk
4. Should see profile on HomeScreen

**Verify:**
- New user appears in Clerk Dashboard
- Email matches what was authenticated
- Name auto-filled from Google profile

### Scenario 2: Return User Sign-In
1. Sign out from the app
2. Sign in again with same Google account
3. Should see same profile (user not duplicated)

**Verify:**
- Clerk Dashboard shows same user ID
- No duplicate user entries

### Scenario 3: Session Persistence
1. Sign in to the app
2. Refresh the page (Cmd+R on Mac, F5 on Windows)
3. Should remain signed in (session in SecureStore)

**Verify:**
- No need to sign in again
- HomeScreen loads immediately
- User profile displays

### Scenario 4: Sign-Out & Re-Sign-In
1. Sign in with Google
2. Tap "Sign Out" button
3. Should return to Sign-In screen
4. Sign in again with different Google account
5. Should show new user's profile

**Verify:**
- Sign-out clears session properly
- Can sign in with different account
- Profile updates correctly

---

## Browser DevTools Testing

### Console Logs
Open browser DevTools (F12):
```
Console → Should show:
[web] Logs will appear in the browser console
```

### Network Tab
Monitor OAuth flow:
1. Sign in with Google
2. Network tab shows:
   - Redirect to OAuth endpoint
   - Clerk token exchange
   - Session storage

### Application Tab
Check stored data:
- **LocalStorage**: Clerk session tokens
- **SecureStore** (React Native): OAuth tokens

---

## Performance Testing

Expected timing:
- **Page load**: < 2 seconds
- **OAuth redirect**: < 1 second
- **Profile display**: Immediate (from SecureStore)
- **Sign-out**: < 500ms

---

## Success Criteria

✅ **All of the following:**
1. Dev server starts on port 8081
2. Browser can load http://localhost:8081
3. Sign-In screen displays
4. Can click Google sign-in button
5. OAuth flow redirects to Google
6. After authentication, HomeScreen shows user profile
7. User email displays correctly
8. User name displays correctly (if available)
9. "Connected Providers" shows Google OAuth
10. Sign-Out button works
11. After sign-out, returns to Sign-In screen
12. Session persists after page refresh

**If all 12 are true, Phase 3 is complete! ✅**

---

## Next Steps After Testing

If testing is successful:
1. ✅ Phase 3: Sign-In/Sign-Up flow verified
2. → Phase 4: Add error handling & resilience patterns
3. → Phase 5: Production deployment configuration

---

## Resources

- **App Entry:** [App.tsx](./App.tsx)
- **Sign-In Component:** [screens/SignInScreen.tsx](./screens/SignInScreen.tsx)
- **Home Component:** [screens/HomeScreen.tsx](./screens/HomeScreen.tsx)
- **Implementation Details:** [PHASE3_IMPLEMENTATION.md](./PHASE3_IMPLEMENTATION.md)
- **Clerk Docs:** https://clerk.com/docs/expo
- **Expo Web:** https://docs.expo.dev/develop/user-interface/expo-web/

---

## Reporting Issues

If you encounter issues:

1. **Check the logs:**
   ```bash
   tail -100 /tmp/dev.log
   ```

2. **View browser console:**
   - DevTools → Console tab
   - Look for error messages

3. **Verify setup:**
   ```bash
   # Check Clerk credentials
   grep "CLERK" .env.local
   
   # Check server is running
   ps aux | grep "expo start"
   
   # Check port 8081 is open
   lsof -i :8081
   ```

---

**Status: Ready for Testing** ✅

Start the dev server with `npm run web` and visit `http://localhost:8081`

