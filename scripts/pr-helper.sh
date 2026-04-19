#!/bin/bash
# /pr skill - Create a branch, commit changes, and open a pull request

set -e

echo "📋 PR Helper - Create Branch, Commit & Open PR"
echo ""

# Get current branch and uncommitted changes
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
UNCOMMITTED=$(git status --porcelain)

if [ -z "$UNCOMMITTED" ]; then
    echo "❌ No changes to commit"
    exit 1
fi

echo "✅ Found uncommitted changes"
echo ""

# Prompt for PR title
echo "Enter a short PR title (or press Enter to use current changes):"
read -r PR_TITLE

if [ -z "$PR_TITLE" ]; then
    PR_TITLE=$(echo "$UNCOMMITTED" | head -1 | sed 's/^[^ ]* //')
fi

# Sanitize branch name
BRANCH_NAME=$(echo "$PR_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//' | cut -c1-50)
BRANCH_NAME="feature/${BRANCH_NAME}"

echo ""
echo "🔍 Scanning for secrets before commit..."

# Basic secret scan
if grep -r "PRIVATE_KEY\|SECRET_KEY\|PASSWORD\|TOKEN" --include="*.env*" . 2>/dev/null | grep -v node_modules | grep -v ".git"; then
    echo "⚠️  Potential secrets detected in .env files"
    echo "Make sure you're not committing real credentials!"
    read -p "Continue anyway? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo ""
echo "📝 Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

echo "✅ Staging changes..."
git add .

echo "💬 Enter commit message:"
read -r COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="$PR_TITLE"
fi

echo ""
echo "📤 Committing..."
git commit -m "$COMMIT_MSG"

echo ""
echo "🚀 Pushing to remote..."
git push -u origin "$BRANCH_NAME"

echo ""
echo "📋 Enter PR description (press Ctrl+D when done):"
PR_DESCRIPTION=$(cat)

echo ""
echo "Creating pull request..."
gh pr create \
    --title "$PR_TITLE" \
    --body "## Summary
$PR_DESCRIPTION

## Test Plan
- [ ] Run tests: \`npm test\`
- [ ] Manual testing in browser
- [ ] Demo mode verification (if applicable)

🤖 Created with Claude Code /pr skill" \
    --base main \
    --head "$BRANCH_NAME"

echo ""
echo "✅ PR created successfully!"
