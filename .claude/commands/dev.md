# Start Development Server

Starts the Expo web development server and opens the app in the browser.

## What it does

1. Kills any existing Expo processes
2. Starts the dev server on port 8081
3. Displays the URL to open in browser
4. Shows a demo mode option if authentication isn't available

## Execute

```bash
# Kill existing Expo processes
pkill -f "expo start" || true

# Start dev server
npm run web
```

## Next Steps

Once the server starts:

1. Open http://localhost:8081 in your browser
2. For testing without auth, click **"Try Demo Mode"** on the sign-in page
3. Use any email/password to enter demo (e.g., `test@example.com` / `password`)
4. The dev server auto-reloads when you make changes

## Environment

- The app uses `.env` for Clerk authentication config
- Demo mode provides full app testing without external auth
- Original auth infrastructure remains for production
