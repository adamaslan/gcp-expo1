# Create Branch, Commit, and PR

Creates a new branch from current changes, commits everything, and opens a pull request.

## Steps

1. Check git status to see what's changed
2. Create a new branch with descriptive name (derived from changes)
3. Stage all changed/untracked files (scan for secrets first)
4. Commit with a descriptive message in conventional format
5. Push to remote
6. Create a PR against `main` branch with summary and test plan

## Rules

- Never commit `.env.local`, credential files, or files with secret patterns
- Branch naming: `feature/`, `fix/`, `docs/`, or `refactor/` prefix derived from changes
- Commit format: `type(scope): description`
- PR body includes summary, test plan, and attribution

## Execute

Run these steps now for the current working directory:

```bash
# 1. Show current state
git status
git diff

# 2. Create feature branch with meaningful name
git checkout -b <feature/scope-description>

# 3. Stage relevant files (not secrets or .env files)
git add <specific files>

# 4. Commit with conventional format
git commit -m "type(scope): description

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# 5. Push to remote
git push -u origin HEAD

# 6. Create PR against main
gh pr create --base main --title "..." --body "## Summary\n\n...\n\n## Test Plan\n\n- [ ] Run tests\n- [ ] Manual testing"
```

Analyze the actual changes and:
- Generate an appropriate branch name
- Create a clear commit message
- Write a PR description with summary and test checklist
- Verify no secrets are being committed
