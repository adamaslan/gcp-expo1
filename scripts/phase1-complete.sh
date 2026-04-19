#!/bin/bash

# Phase 1 Completion Script
# Run after creating OAuth credentials in GCP Console

set -e

if [ $# -lt 2 ]; then
  echo "Usage: ./scripts/phase1-complete.sh YOUR_CLIENT_ID YOUR_CLIENT_SECRET"
  echo ""
  echo "Example:"
  echo "  ./scripts/phase1-complete.sh 123456789.apps.googleusercontent.com GOCSPX-xxxxx"
  exit 1
fi

CLIENT_ID="$1"
CLIENT_SECRET="$2"
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "=========================================="
echo "Phase 1: Finalizing Setup"
echo "=========================================="
echo ""

# Step 1: Create .env.local from template
echo "✓ Step 1: Creating .env.local..."
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  echo "  ⚠️  .env.local already exists (will not overwrite)"
else
  cp "$PROJECT_ROOT/.env.local.template" "$PROJECT_ROOT/.env.local"
  echo "  ✅ .env.local created from template"
fi

# Step 2: Update credentials in .env.local
echo ""
echo "✓ Step 2: Inserting Google OAuth credentials..."
if command -v sed &> /dev/null; then
  # Use sed to replace placeholder values
  sed -i.bak "s|NEXT_PUBLIC_GOOGLE_CLIENT_ID=.*|NEXT_PUBLIC_GOOGLE_CLIENT_ID=${CLIENT_ID}|" "$PROJECT_ROOT/.env.local"
  sed -i.bak "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}|" "$PROJECT_ROOT/.env.local"
  rm -f "$PROJECT_ROOT/.env.local.bak"
  echo "  ✅ Google OAuth credentials configured"
else
  echo "  ⚠️  sed not found, please manually add to .env.local:"
  echo "     NEXT_PUBLIC_GOOGLE_CLIENT_ID=${CLIENT_ID}"
  echo "     GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}"
fi

# Step 3: Display next steps
echo ""
echo "=========================================="
echo "✅ Phase 1 Complete!"
echo "=========================================="
echo ""
echo "Current .env.local configuration:"
echo ""
grep -E "NEXT_PUBLIC_GOOGLE|GOOGLE_CLIENT" "$PROJECT_ROOT/.env.local" || true
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Add Clerk credentials to .env.local:"
echo "   nano .env.local"
echo "   (Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY)"
echo ""
echo "2. Get your Clerk keys from:"
echo "   https://dashboard.clerk.com → Get Keys"
echo ""
echo "3. Test locally:"
echo "   npm run dev"
echo ""
echo "4. Deploy to Vercel:"
echo "   ./scripts/setup-vercel-env.sh"
echo "   vercel --prod"
echo ""
echo "See: ALL_PHASES_GUIDE.md for Phase 2 (Clerk)"
echo ""
