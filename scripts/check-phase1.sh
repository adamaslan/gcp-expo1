#!/bin/bash

# Phase 1 Verification Script
# Checks that all Phase 1 steps are complete

set -e

export GCP_PROJECT_ID="REDACTED"
export APP_NAME="nuwrrrld"

echo "========================================="
echo "Phase 1 Verification Checklist"
echo "========================================="
echo ""

# Check 1: gcloud setup
echo "Check 1: GCP Project & gcloud"
if [ "$(gcloud config get-value core/project)" = "$GCP_PROJECT_ID" ]; then
  echo "  ✅ GCP Project set correctly: $GCP_PROJECT_ID"
else
  echo "  ❌ GCP Project not set. Run: gcloud config set project $GCP_PROJECT_ID"
  exit 1
fi
echo ""

# Check 2: APIs enabled
echo "Check 2: Required APIs"
APIS=(
  "cloudresourcemanager.googleapis.com"
  "serviceusage.googleapis.com"
  "iap.googleapis.com"
)

for api in "${APIS[@]}"; do
  if gcloud services list --enabled | grep -q "$api"; then
    echo "  ✅ $api"
  else
    echo "  ❌ $api (not enabled)"
  fi
done
echo ""

# Check 3: Service account exists
echo "Check 3: Service Account"
if gcloud iam service-accounts describe oauth-admin@${GCP_PROJECT_ID}.iam.gserviceaccount.com 2>/dev/null; then
  echo "  ✅ oauth-admin service account exists"
else
  echo "  ⚠️  oauth-admin service account not found"
fi
echo ""

# Check 4: Environment files
echo "Check 4: Configuration Files"
if [ -f ".env.oauth.example" ]; then
  echo "  ✅ .env.oauth.example exists"
else
  echo "  ❌ .env.oauth.example not found"
fi

if [ -f ".env.local" ]; then
  echo "  ✅ .env.local exists"
  if grep -q "NEXT_PUBLIC_GOOGLE_CLIENT_ID=" .env.local; then
    echo "     ✅ Contains NEXT_PUBLIC_GOOGLE_CLIENT_ID"
  else
    echo "     ⚠️  Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID"
  fi
  if grep -q "GOOGLE_CLIENT_SECRET=" .env.local; then
    echo "     ✅ Contains GOOGLE_CLIENT_SECRET"
  else
    echo "     ⚠️  Missing GOOGLE_CLIENT_SECRET"
  fi
else
  echo "  ⚠️  .env.local not found. Copy from .env.oauth.example"
fi
echo ""

# Check 5: Scripts exist
echo "Check 5: Automation Scripts"
scripts=(
  "scripts/setup-oauth.sh"
  "scripts/setup-vercel-env.sh"
)

for script in "${scripts[@]}"; do
  if [ -f "$script" ]; then
    echo "  ✅ $script"
  else
    echo "  ❌ $script not found"
  fi
done
echo ""

# Check 6: Vercel setup
echo "Check 6: Vercel CLI"
if command -v vercel &> /dev/null; then
  echo "  ✅ Vercel CLI installed: $(vercel --version)"

  # Check environment variables
  echo "  Checking Vercel environment variables..."
  if vercel env ls 2>/dev/null | grep -q "NEXT_PUBLIC_GOOGLE_CLIENT_ID"; then
    echo "     ✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID set"
  else
    echo "     ⚠️  NEXT_PUBLIC_GOOGLE_CLIENT_ID not set in Vercel"
  fi

  if vercel env ls 2>/dev/null | grep -q "GOOGLE_CLIENT_SECRET"; then
    echo "     ✅ GOOGLE_CLIENT_SECRET set"
  else
    echo "     ⚠️  GOOGLE_CLIENT_SECRET not set in Vercel"
  fi
else
  echo "  ⚠️  Vercel CLI not installed. Run: npm install -g vercel"
fi
echo ""

# Check 7: Clerk setup
echo "Check 7: Clerk Configuration"
if [ -f "package.json" ]; then
  if grep -q "@clerk/clerk-expo" package.json 2>/dev/null; then
    echo "  ✅ @clerk/clerk-expo installed"
  else
    echo "  ⚠️  @clerk/clerk-expo not found in package.json"
  fi
fi

if grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=" .env.local 2>/dev/null; then
  echo "  ✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local"
else
  echo "  ⚠️  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not in .env.local"
fi
echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "To complete Phase 1:"
echo ""
echo "1️⃣  Configure OAuth Consent Screen (2 min)"
echo "   https://console.cloud.google.com/apis/credentials/consent?project=$GCP_PROJECT_ID"
echo ""
echo "2️⃣  Create OAuth 2.0 Client ID (2 min)"
echo "   https://console.cloud.google.com/apis/credentials?project=$GCP_PROJECT_ID"
echo ""
echo "3️⃣  Copy credentials to .env.local"
echo "   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-client-id>"
echo "   GOOGLE_CLIENT_SECRET=<your-client-secret>"
echo ""
echo "4️⃣  Setup Vercel environment"
echo "   ./scripts/setup-vercel-env.sh"
echo ""
echo "5️⃣  Verify setup"
echo "   ./scripts/check-phase1.sh"
echo ""
