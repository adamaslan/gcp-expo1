# Access Demo Mode

Access the demo version of the app without needing authentication credentials.

## What it does

The demo mode provides a fully functional test environment of the Nuwrrrld app with mock authentication. Perfect for:

- Testing UI and navigation
- Verifying features without setting up Clerk
- Demonstrating app functionality
- Quick prototyping and iteration

## Quick Start

1. Make sure the dev server is running: `npm run web`
2. Open http://localhost:8081 in your browser
3. Click **"Try Demo Mode"** button on the sign-in page
4. Enter demo credentials:
   - Email: `demo@example.com` (or any email)
   - Password: `demo123` (or any password)

## Demo Routes

The demo app is accessible at `/demo/`:

- `/demo/sign-in` - Demo sign-in page
- `/demo/(tabs)` - Home screen with navigation
- `/demo/(tabs)/market` - Market overview
- `/demo/(tabs)/signals` - Trading signals
- `/demo/(tabs)/industries` - Industries analysis
- `/demo/(tabs)/screener` - Stock screener

## Architecture

- Demo mode uses a separate MockAuthProvider
- Original Clerk authentication infrastructure is untouched
- Demo routes live in `app/demo/` directory
- You can modify demo pages independently from auth pages

## Switch Back

Click **"Back to Sign In"** button to return to the main sign-in page.
