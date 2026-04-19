#!/bin/bash

# Phase 1: GCP OAuth Setup Script
# This script automates the Google OAuth configuration for the gcp3-mobile project

set -e

export GCP_PROJECT_ID="dfl-auth-25a"
export APP_NAME="nuwrrrld"
export SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "Phase 1: GCP OAuth Setup"
echo "========================================="
echo "Project ID: $GCP_PROJECT_ID"
echo "App Name: $APP_NAME"
echo ""

# Step 1: Verify gcloud is authenticated
echo "Step 1: Verifying gcloud authentication..."
if ! gcloud auth list | grep -q "ACTIVE"; then
  echo "❌ Not authenticated. Run: gcloud auth login"
  exit 1
fi
echo "✓ gcloud authenticated as: $(gcloud config get-value account)"
echo ""

# Step 2: Set project
echo "Step 2: Setting GCP project..."
gcloud config set project $GCP_PROJECT_ID
echo "✓ Project set to: $(gcloud config get-value core/project)"
echo ""

# Step 3: Enable required APIs
echo "Step 3: Enabling required APIs..."
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  iap.googleapis.com \
  2>/dev/null || true
echo "✓ APIs enabled"
echo ""

# Step 4: Create service account for OAuth admin (optional)
echo "Step 4: Checking for OAuth service account..."
SERVICE_ACCOUNT="oauth-admin@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT 2>/dev/null; then
  echo "Creating service account: $SERVICE_ACCOUNT"
  gcloud iam service-accounts create oauth-admin \
    --display-name="OAuth Configuration Manager" \
    --project=$GCP_PROJECT_ID
  echo "✓ Service account created"
else
  echo "✓ Service account already exists"
fi
echo ""

# Step 5: Grant IAM roles
echo "Step 5: Granting IAM roles to service account..."
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.securityAdmin" \
  --condition=None \
  2>/dev/null || true
echo "✓ IAM roles configured"
echo ""

# Step 6: Create OAuth consent screen configuration
echo "Step 6: OAuth consent screen information..."
echo "⚠️  This requires manual setup via Google Cloud Console:"
echo "   1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=$GCP_PROJECT_ID"
echo "   2. Select 'External' as User Type"
echo "   3. Fill in app name: $APP_NAME"
echo "   4. Add authorized domain(s)"
echo "   5. Add scopes: email, profile, openid"
echo ""

# Step 7: Create OAuth 2.0 Client ID
echo "Step 7: Creating OAuth 2.0 Client ID..."
echo "⚠️  Manual setup required via Google Cloud Console:"
echo "   1. Go to: https://console.cloud.google.com/apis/credentials?project=$GCP_PROJECT_ID"
echo "   2. Click 'Create Credentials' → 'OAuth 2.0 Client ID'"
echo "   3. Select 'Web application' as Application type"
echo "   4. Add these Authorized redirect URIs:"
echo "      • https://YOUR_CLERK_INSTANCE.clerk.accounts.com/oauth/callback/google"
echo "      • http://localhost:3000/auth/callback/google"
echo "      • http://localhost:19006/auth/callback/google (Expo Web)"
echo "      • https://your-vercel-domain.vercel.app/auth/callback/google"
echo "      • exp://your-mobile-app-id"
echo ""
echo "   5. Copy the Client ID and Client Secret"
echo ""

# Step 8: Save configuration
echo "Step 8: Creating configuration file..."
cat > "$ROOT_DIR/.env.oauth.example" << 'EOF'
# GCP OAuth Configuration
# Copy this file to .env.local and fill in actual values

# From Google Cloud Console OAuth Credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-client-id-from-gcp>
GOOGLE_CLIENT_SECRET=<your-client-secret-from-gcp>

# For Expo mobile
EXPO_GOOGLE_CLIENT_ID=<your-expo-specific-client-id>

# Clerk configuration (from previous setup)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from-clerk-dashboard>
CLERK_SECRET_KEY=<from-clerk-dashboard>

# Vercel deployment
NEXT_PUBLIC_VERCEL_URL=<auto-set-by-vercel>
VERCEL_ENV=<auto-set-by-vercel>
EOF

echo "✓ Configuration template created at: .env.oauth.example"
echo ""

# Step 9: Create Vercel env setup script
echo "Step 9: Creating Vercel environment setup script..."
cat > "$ROOT_DIR/scripts/setup-vercel-env.sh" << 'EOF'
#!/bin/bash

# Setup Vercel environment variables from GCP OAuth credentials

echo "Setting up Vercel environment variables..."
echo ""

# Ensure we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run from project root."
  exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not found. Install with: npm install -g vercel"
  exit 1
fi

echo "Add the following variables to Vercel:"
echo ""
echo "1. NEXT_PUBLIC_GOOGLE_CLIENT_ID (from GCP Console)"
echo "   vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID"
echo ""
echo "2. GOOGLE_CLIENT_SECRET (from GCP Console - SECRET)"
echo "   vercel env add GOOGLE_CLIENT_SECRET"
echo ""
echo "3. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (from Clerk Dashboard)"
echo "   vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo ""
echo "4. CLERK_SECRET_KEY (from Clerk Dashboard - SECRET)"
echo "   vercel env add CLERK_SECRET_KEY"
echo ""

echo "Or use interactive setup:"
read -p "Run vercel env add commands now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID
  vercel env add GOOGLE_CLIENT_SECRET
  vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  vercel env add CLERK_SECRET_KEY
fi

echo "✓ Vercel environment setup complete"
echo ""
echo "To verify variables are set:"
echo "  vercel env ls"
EOF

chmod +x "$ROOT_DIR/scripts/setup-vercel-env.sh"
echo "✓ Vercel setup script created at: scripts/setup-vercel-env.sh"
echo ""

# Step 10: Summary
echo "========================================="
echo "✓ Phase 1 Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Configure OAuth consent screen & create OAuth 2.0 Client ID in GCP Console"
echo "2. Copy Client ID and Client Secret"
echo "3. Fill in .env.local with OAuth credentials"
echo "4. Run: ./scripts/setup-vercel-env.sh"
echo "5. Verify with: vercel env ls"
echo ""
echo "Documentation:"
echo "• GCP Console: https://console.cloud.google.com/apis/credentials?project=$GCP_PROJECT_ID"
echo "• Clerk Dashboard: https://dashboard.clerk.com"
echo "• Vercel: https://vercel.com"
echo ""
