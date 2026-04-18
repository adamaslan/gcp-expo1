# Create Branch, Commit, and PR

Creates a new branch from current changes, commits everything, and opens a pull request for the gcp3-mobile app.

## Steps

1. Check git status to see what's changed
2. Create a new branch if not already on a feature branch (branch name derived from changes)
3. Stage all changed/untracked files (excluding secrets)
4. Commit with a descriptive message
5. Push to remote
6. Create a PR against main

## Rules

- Never commit `.env`, credential files, or files matching secret patterns
- Do a scan of all new files and changes to existing files to make sure no secrets or sensitive data is shown
- Branch naming: `feature/`, `fix/`, `refactor/`, or `demo/` prefix
- Commit format: `type(scope): description`
- PR body includes summary and test plan
- Exclude: `.env`, `*.key`, `*.secret`, `node_modules`, `.expo`, `.next`, `build/`, `dist/`

## Execute

Run these steps now for the current working directory:

```bash
# 1. Show current state
git status
git diff

# 2. Create branch (feature/fix/refactor/demo based on changes)
git checkout -b <relevant branch name>

# 3. Stage relevant files (not secrets)
git add <specific files>

# 4. Commit
git commit -m "type(scope): description

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# 5. Push
git push -u origin HEAD

# 6. Create PR and output the URL
gh pr create --title "..." --body "..."
```

Analyze the actual changes and generate an appropriate branch name, commit message, and PR description automatically.

## Output Requirement

After creating the PR, output the URL as a clickable markdown link:

**PR:** [owner/repo#NNN](URL)

Capture the URL from `gh pr create` output and render it as a markdown link so the user can click it directly.
