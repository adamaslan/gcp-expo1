# Create Branch, Commit, and PR

Creates a new branch from current changes, commits everything with security scanning, and opens a pull request.

## Security Checklist

**BEFORE COMMITTING - SCAN FOR SECRETS:**

Critical files to NEVER commit:
- ❌ `.env` (all environment files)
- ❌ `.env.local`, `.env.*.local`
- ❌ `*.pem`, `*.key`, `*.jks`, `*.p12`, `*.p8`
- ❌ `.mobileprovision`, AWS credential files
- ❌ Private keys, API keys, tokens, passwords
- ❌ `node_modules/`, build artifacts
- ❌ `.claude/settings.local.json` (personal config)

**Secret patterns to reject:**
- `PRIVATE_KEY`, `SECRET_KEY`, `API_KEY`, `TOKEN`, `PASSWORD`
- `sk_test_*`, `sk_live_*` (Stripe)
- `CLERK_SECRET_KEY`, `SUPABASE_KEY`
- `AWS_SECRET_ACCESS_KEY`, `GOOGLE_PRIVATE_KEY`
- Email addresses with credentials
- Database connection strings with passwords

## Steps

1. Check git status and diff for secrets
2. Run security scan for exposed credentials
3. Create a new branch with descriptive name
4. Stage ONLY safe files (exclude secrets and build artifacts)
5. Review staged files before committing
6. Commit with conventional format
7. Push to remote
8. Create PR with security attestation

## Execute

Run these steps now:

```bash
# 1. Show current state
git status
git diff

# 2. CRITICAL: Scan for secrets BEFORE staging
echo "🔍 Scanning for secrets..."
git diff | grep -iE "(PRIVATE|SECRET|TOKEN|PASSWORD|API_KEY|CLERK_SECRET|AWS_SECRET|SUPABASE_KEY)" && {
  echo "⚠️  SECRETS DETECTED - DO NOT COMMIT"
  exit 1
} || echo "✅ No obvious secrets in diff"

# 3. Check for .env files
if git status --porcelain | grep -E '\.env($|\.local)'; then
  echo "❌ .env files present - add to .gitignore"
  exit 1
fi

# 4. Verify .gitignore is correct
grep -E "^\.env$|^\.env\*\.local$" .gitignore || {
  echo "❌ .env not in .gitignore - fix this first"
  exit 1
}

# 5. Create feature branch with meaningful name
git checkout -b <feature/scope-description>

# 6. Stage ONLY specific safe files
git add <specific files>

# 7. Review staged changes before commit
echo "Staged files:"
git diff --cached --name-only
echo ""
echo "⚠️  Review above carefully - verify NO .env or credential files"
read -p "Continue with commit? (y/N): " confirm
[ "$confirm" = "y" ] || exit 1

# 8. Commit with conventional format
git commit -m "type(scope): description

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# 9. Push to remote
git push -u origin HEAD

# 10. Create PR against main with security note
gh pr create \
  --base main \
  --title "feat/fix: short description" \
  --body "## Summary

Brief description of changes.

## Security Verification

- [x] No .env files committed
- [x] No API keys or tokens
- [x] No private keys or credentials
- [x] .gitignore properly configured
- [x] No sensitive data in commit messages

## Test Plan

- [ ] Run tests: \`npm test\`
- [ ] Manual testing in browser
- [ ] Demo mode verification (if applicable)
- [ ] Check for regressions in related features

🔒 Security verified before commit"
```

Analyze the actual changes and:
- **SCAN for secrets** before any staging
- Verify .env files are gitignored
- Generate appropriate branch name
- Stage only safe files explicitly
- Create clear commit message
- Attest security in PR description
