# Demo Mode Quick Start

Access and understand demo mode for testing without authentication.

## What is Demo Mode?

Demo mode allows you to:
- Test the app without Clerk authentication
- Access protected routes without credentials
- Test analytics and user flows
- Use a separate mock architecture that doesn't touch real auth

## Quick Start

1. Run `/dev` to start the development server
2. Navigate to `http://localhost:8081/demo`
3. Or click "Try Demo" on the home page

## Demo Routes

| Route | Purpose |
|-------|---------|
| `/demo` | Demo home page with overview |
| `/demo/protected` | Protected route example (no auth needed in demo) |
| `/demo/analytics` | Analytics example with mock data |
| `/demo/profile` | User profile example |
| `/demo/settings` | Settings example |

## Demo Architecture

Demo mode uses a **separate mock architecture**:

```
App
├── Real Auth (default)
│   ├── Clerk integration
│   ├── Google OAuth
│   └── Real user data
│
└── Demo Mode (isolated)
    ├── Mock user context
    ├── Mock data provider
    ├── Simulated protected routes
    └── No Clerk dependencies
```

### Key Differences

**Real Mode:**
- Requires Clerk configuration
- Uses Google OAuth
- Accesses real database
- Full auth flow

**Demo Mode:**
- No Clerk needed
- Mock user data
- Simulated routes
- Instant access

## Starting Demo Mode

### Option 1: From Home Page
```
1. Start dev server: /dev
2. Visit http://localhost:8081
3. Click "Try Demo" button
```

### Option 2: Direct URL
```
1. Start dev server: /dev
2. Visit http://localhost:8081/demo directly
```

### Option 3: From Command
```bash
# Check that server is running
curl http://localhost:8081/demo
```

## Testing in Demo Mode

Demo mode is perfect for:
- UI/UX testing without auth setup
- Testing protected components
- Verifying user flows
- Rapid iteration without credentials
- Onboarding new developers

## Common Tasks in Demo

**Test a protected route:**
- Navigate to `/demo/protected`
- You're automatically logged in as a mock user
- No Clerk configuration needed

**Check analytics:**
- Go to `/demo/analytics`
- View mock analytics data
- Test data visualization components

**Test user profile:**
- Visit `/demo/profile`
- Edit mock user data
- Test profile update flows

## When to Use Demo vs Real Auth

| Task | Use Demo | Use Real |
|------|----------|----------|
| UI testing | ✅ | ❌ |
| Auth flow testing | ❌ | ✅ |
| Component development | ✅ | ❌ |
| Analytics testing | ✅ | ✅ |
| OAuth integration | ❌ | ✅ |
| Rapid prototyping | ✅ | ❌ |

## Exiting Demo Mode

Simply navigate away or close the demo tab. Demo mode is a separate app instance.

## Configuration

Demo mode configuration is in:
- `app.config.ts` - Feature flags
- `lib/demo/` - Mock data providers
- `routes/demo/` - Demo route definitions

## Troubleshooting

**Demo page won't load:**
- Ensure dev server is running: `/dev`
- Check port 8081 is accessible: `curl http://localhost:8081`

**Mock data not showing:**
- Clear browser cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Need real auth?**
- Exit demo and complete Phase 2 setup
- See `/PHASE2_START_HERE.md`

## Next Steps

- **For UI testing:** Use demo mode
- **For auth setup:** See PHASE2_START_HERE.md
- **For component dev:** Use demo with `/dev`
- **For integration:** Switch to real auth mode
