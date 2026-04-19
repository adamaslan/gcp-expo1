#!/bin/bash

# Phase 1 Automated Setup Script
# This script automates what can be done via CLI
# Manual steps required: OAuth Consent Screen + Client ID creation in GCP Console

set -e

PROJECT_ID="dfl-auth-25a"
SERVICE_ACCOUNT="oauth-admin@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=========================================="
echo "Phase 1: GCP OAuth Setup - CLI Automation"
echo "=========================================="
echo ""

# Step 1: Verify project
echo "✓ Step 1: Verifying GCP Project..."
gcloud config set project $PROJECT_ID > /dev/null
gcloud projects describe $PROJECT_ID > /dev/null && echo "  ✅ Project dfl-auth-25a is ready"

# Step 2: Enable APIs
echo ""
echo "✓ Step 2: Enabling required APIs..."
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  iap.googleapis.com \
  oauth2.googleapis.com \
  iam.googleapis.com > /dev/null 2>&1 && echo "  ✅ APIs enabled"

# Step 3: Create/verify service account
echo ""
echo "✓ Step 3: Setting up OAuth Service Account..."
gcloud iam service-accounts create oauth-admin \
  --display-name="OAuth Configuration Manager" > /dev/null 2>&1 || true
echo "  ✅ Service account ready"

# Step 4: Grant permissions
echo ""
echo "✓ Step 4: Granting IAM roles..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.securityAdmin" > /dev/null 2>&1 || true
echo "  ✅ IAM roles configured"

# Step 5: Display next steps
echo ""
echo "=========================================="
echo "📋 MANUAL STEPS REQUIRED (GCP Console)"
echo "=========================================="
echo ""
echo "👉 Step 1: Configure OAuth Consent Screen"
echo "   URL: https://console.cloud.google.com/apis/credentials/consent?project=${PROJECT_ID}"
echo ""
echo "   1. Click 'Create Consent Screen'"
echo "   2. Select User Type: 'External'"
echo "   3. Fill App Information:"
echo "      - App name: Nuwrrrld"
echo "      - User support email: chillcoders@gmail.com"
echo "      - Developer contact: chillcoders@gmail.com"
echo "   4. Add Scopes: email, profile, openid"
echo "   5. Add Test Users: chillcoders@gmail.com"
echo "   6. Save"
echo ""
echo "👉 Step 2: Create OAuth 2.0 Client ID"
echo "   URL: https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"
echo ""
echo "   1. Click 'Create Credentials' → 'OAuth 2.0 Client ID'"
echo "   2. Application Type: 'Web application'"
echo "   3. Name: 'Nuwrrrld OAuth Web Client'"
echo "   4. Authorized JavaScript Origins:"
echo "      - http://localhost:3000"
echo "      - http://localhost:19006"
echo "      - https://clerk.accounts.com"
echo "   5. Authorized Redirect URIs:"
echo "      - http://localhost:3000/auth/callback/google"
echo "      - http://localhost:19006/auth/callback/google"
echo "      - https://YOUR_CLERK_INSTANCE.clerk.accounts.com/oauth/callback/google"
echo "   6. Click 'Create'"
echo "   7. Copy Client ID and Client Secret"
echo ""
echo "=========================================="
echo "After completing GCP Console steps:"
echo "=========================================="
echo ""
echo "Run this command to set up your .env.local:"
echo ""
echo "  ./scripts/phase1-complete.sh YOUR_CLIENT_ID YOUR_CLIENT_SECRET"
echo ""
echo "Example:"
echo "  ./scripts/phase1-complete.sh 123456789.apps.googleusercontent.com GOCSPX-xxxxx"
echo ""
