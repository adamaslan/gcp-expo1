# GCP Infrastructure Setup via gcloud CLI

**Complete guide to setting up Google Cloud Platform OAuth infrastructure using the command-line interface.**

This guide covers every step taken to automate Phase 1 without touching the GCP Console.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Overview](#overview)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)
6. [Advanced: Automation Scripts](#advanced-automation-scripts)
7. [What Each Step Does](#what-each-step-does)

---

## Prerequisites

### Required Tools

```bash
# Check if gcloud is installed
which gcloud

# Check version (should be 5.0.0 or higher)
gcloud --version

# If not installed, download from:
# https://cloud.google.com/sdk/docs/install
```

### Required Permissions

Your GCP account must have:
- ✅ Project Editor role
- ✅ Service Account Admin role
- ✅ Security Admin role

### Account Setup

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set your Google Cloud Project
gcloud config set project REDACTED

# Verify authentication
gcloud auth list
```

---

## Overview

The Phase 1 setup creates this infrastructure:

```
GCP Project: REDACTED
│
├─ APIs Enabled
│  ├─ cloudresourcemanager.googleapis.com (manage resources)
│  ├─ serviceusage.googleapis.com (manage services)
│  ├─ iap.googleapis.com (identity access)
│  └─ iam.googleapis.com (identity management)
│
├─ Service Account
│  └─ oauth-admin@REDACTED.iam.gserviceaccount.com
│     └─ Role: roles/iam.securityAdmin
│
└─ Ready for OAuth Client ID creation
```

---

## Step-by-Step Setup

### Step 1: Set GCP Project

Set your active project to `REDACTED`:

```bash
gcloud config set project REDACTED
```

**What this does:**
- Sets the default project for all subsequent gcloud commands
- Stores the setting in `~/.config/gcloud/properties`
- All operations will target this project

**Verify:**
```bash
gcloud config get-value project
# Output: REDACTED

gcloud projects describe REDACTED
# Output: Full project details including projectId, projectNumber, lifecycle
```

---

### Step 2: Enable Required APIs

The following APIs must be enabled in your GCP project. These provide the core infrastructure for OAuth:

#### 2.1: Cloud Resource Manager API

```bash
gcloud services enable cloudresourcemanager.googleapis.com
```

**What it does:**
- Allows managing GCP resources via API/CLI
- Required for IAM operations
- Manages resource hierarchy (folders, projects, etc.)

**Verify:**
```bash
gcloud services list --enabled | grep cloudresourcemanager
# Output: cloudresourcemanager.googleapis.com  Cloud Resource Manager API
```

#### 2.2: Service Usage API

```bash
gcloud services enable serviceusage.googleapis.com
```

**What it does:**
- Allows enabling/disabling services via API
- Tracks API usage and quotas
- Essential for programmatic service management

**Verify:**
```bash
gcloud services list --enabled | grep serviceusage
# Output: serviceusage.googleapis.com          Service Usage API
```

#### 2.3: IAM API

```bash
gcloud services enable iam.googleapis.com
```

**What it does:**
- Identity & Access Management
- Create service accounts
- Assign IAM roles
- Manage credentials

**Verify:**
```bash
gcloud services list --enabled | grep "iam.googleapis"
# Output: iam.googleapis.com                  Identity and Access Management (IAM) API
```

#### 2.4: Cloud IAP API (Optional but Recommended)

```bash
gcloud services enable iap.googleapis.com
```

**What it does:**
- Identity-Aware Proxy
- Provides secure access control
- Integrates with OAuth flows
- Used for protecting your application endpoints

**Verify:**
```bash
gcloud services list --enabled | grep iap
# Output: iap.googleapis.com                  Cloud Identity-Aware Proxy API
```

#### Enable All APIs at Once

Combine into a single command:

```bash
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  iam.googleapis.com \
  iap.googleapis.com \
  --quiet
```

**Flags:**
- `--quiet` — Skip confirmation prompts (useful for automation)

---

### Step 3: Create OAuth Service Account

A service account is a special Google Cloud account for applications and automation:

```bash
gcloud iam service-accounts create oauth-admin \
  --display-name="OAuth Configuration Manager" \
  --project=REDACTED
```

**Parameters:**
- `oauth-admin` — Account name (identifier, must be lowercase)
- `--display-name` — Human-readable name for the console
- `--project` — Target project (optional if already set)

**What this does:**
- Creates a new service account in your project
- Generates a unique service account email: `oauth-admin@REDACTED.iam.gserviceaccount.com`
- Account is inactive until roles are assigned
- No credentials created yet

**Verify:**

```bash
# List all service accounts
gcloud iam service-accounts list

# Describe the specific account
gcloud iam service-accounts describe oauth-admin@REDACTED.iam.gserviceaccount.com

# Output includes:
# - displayName: OAuth Configuration Manager
# - email: oauth-admin@REDACTED.iam.gserviceaccount.com
# - disabled: False
```

**If account already exists:**

```bash
# This error is safe (idempotent):
# ERROR: (gcloud.iam.service-accounts.create) Resource in projects 
# [REDACTED] is the subject of a conflict: Service account 
# oauth-admin already exists

# Just continue to the next step
```

---

### Step 4: Grant IAM Roles to Service Account

The service account needs specific permissions to manage OAuth:

```bash
gcloud projects add-iam-policy-binding REDACTED \
  --member="serviceAccount:oauth-admin@REDACTED.iam.gserviceaccount.com" \
  --role="roles/iam.securityAdmin"
```

**Parameters:**
- `REDACTED` — Your GCP project
- `--member` — The service account (use full email)
- `--role` — IAM role to assign

**What this does:**
- Binds the `roles/iam.securityAdmin` role to your service account
- Allows the service account to:
  - Create and manage service accounts
  - Create and rotate keys
  - Assign IAM roles
  - Manage OAuth credentials

**Available Roles** (reference):

| Role | Permission | Use Case |
|------|-----------|----------|
| `roles/iam.securityAdmin` | Full IAM control | OAuth admin operations |
| `roles/iam.serviceAccountAdmin` | Manage service accounts | Create/delete accounts |
| `roles/iam.serviceKeyAdmin` | Manage keys | Create API keys |
| `roles/iam.serviceAccountUser` | Use service account | Run as this account |

**Verify:**

```bash
# List all bindings for a service account
gcloud projects get-iam-policy REDACTED \
  --flatten="bindings[].members" \
  --filter="bindings.members:oauth-admin@REDACTED.iam.gserviceaccount.com"

# Output:
# bindings:
# - members:
#   - serviceAccount:oauth-admin@REDACTED.iam.gserviceaccount.com
#   role: roles/iam.securityAdmin
```

---

### Step 5: (Optional) Create and Store Service Account Keys

If you need to use the service account outside of the gcloud CLI:

```bash
# Create a key file
gcloud iam service-accounts keys create /tmp/oauth-admin-key.json \
  --iam-account=oauth-admin@REDACTED.iam.gserviceaccount.com

# Output:
# created key [xxxxxxxxxxxxxxxx] of type [json] as [/tmp/oauth-admin-key.json]
```

**What this does:**
- Creates a JSON key file containing the service account credentials
- File includes: private key, client email, client ID, etc.
- Can be used by applications to authenticate as this service account

**⚠️ Security Warning:**
```bash
# DO NOT commit this file to git!
# DO NOT share with untrusted parties!
# Treat like a password

# Better: Store in secure location
cp /tmp/oauth-admin-key.json ~/.gcp/oauth-admin-key.json
chmod 600 ~/.gcp/oauth-admin-key.json

# Use it with:
export GOOGLE_APPLICATION_CREDENTIALS=~/.gcp/oauth-admin-key.json
```

---

## Verification

### Quick Verification

Run this to verify everything is set up:

```bash
#!/bin/bash
PROJECT_ID="REDACTED"
SERVICE_ACCOUNT="oauth-admin@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=== Phase 1 GCP Setup Verification ==="
echo ""

# Check 1: Project
echo "1️⃣  GCP Project:"
gcloud projects describe $PROJECT_ID --format="value(projectId,name)"
echo ""

# Check 2: APIs
echo "2️⃣  APIs Enabled:"
gcloud services list --enabled --filter="name:(cloudresourcemanager|serviceusage|iam|iap)" --format="value(name)"
echo ""

# Check 3: Service Account
echo "3️⃣  Service Account:"
gcloud iam service-accounts describe $SERVICE_ACCOUNT --format="value(email,displayName)"
echo ""

# Check 4: IAM Bindings
echo "4️⃣  IAM Roles:"
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:$SERVICE_ACCOUNT" \
  --format="table(bindings.role)"
echo ""

echo "✅ All checks passed!"
```

### Detailed Status Check

```bash
PROJECT_ID="REDACTED"

# Get project number
gcloud projects describe $PROJECT_ID --format="value(projectNumber)"

# List all service accounts
gcloud iam service-accounts list --project=$PROJECT_ID

# Get all IAM bindings
gcloud projects get-iam-policy $PROJECT_ID --format=json

# Check specific APIs
gcloud services list --enabled --project=$PROJECT_ID
```

---

## Troubleshooting

### Error: "Project not found"

```bash
gcloud projects describe REDACTED
# ERROR: (gcloud.projects.describe) Not Found.
```

**Solution:**
```bash
# List your projects
gcloud projects list

# Set correct project
gcloud config set project YOUR_CORRECT_PROJECT_ID
```

---

### Error: "Permission denied"

```bash
gcloud iam service-accounts create oauth-admin ...
# ERROR: User [you@example.com] does not have permission to access 
# projects instance [REDACTED]
```

**Solution:**
```bash
# Check your current account
gcloud auth list

# Ensure you have Project Editor role
# (Ask project admin or check GCP Console: IAM & Admin → IAM)

# Authenticate as correct user
gcloud auth login your-correct-email@gmail.com
```

---

### Error: "Service account already exists"

```bash
gcloud iam service-accounts create oauth-admin ...
# ERROR: (gcloud.iam.service-accounts.create) Resource in projects 
# [REDACTED] is the subject of a conflict: Service account 
# oauth-admin already exists
```

**Solution:**
```bash
# This is safe - just continue
# The service account exists and is ready to use

# Verify it's correct
gcloud iam service-accounts describe oauth-admin@REDACTED.iam.gserviceaccount.com

# Continue to Step 4 (grant IAM roles)
```

---

### Error: "API not enabled"

```bash
gcloud services describe oauth2.googleapis.com
# ERROR: Invalid value for '[SERVICE]': oauth2.googleapis.com is disabled.
```

**Solution:**
```bash
# Enable the API
gcloud services enable oauth2.googleapis.com

# Wait a few seconds
sleep 5

# Verify
gcloud services list --enabled | grep oauth2
```

---

### Cannot authenticate from CI/CD

```bash
# In GitHub Actions, GitLab CI, or Jenkins:
# Set up Application Default Credentials
gcloud auth application-default login

# Or use a service account:
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
```

---

## What Each Step Does

### Service Account vs OAuth Client ID

**Service Account** (what we created):
- ✅ Used by applications to authenticate to Google Cloud
- ✅ Used by CI/CD pipelines
- ✅ Can impersonate other accounts
- ✅ Long-lived credentials
- ✅ Used internally by Google Cloud

**OAuth 2.0 Client ID** (created manually in Console):
- ✅ Used by end-users to sign in
- ✅ Handles user authentication
- ✅ Short-lived tokens
- ✅ Follows OAuth 2.0 spec
- ✅ Returns user information to your app

**For this project:**
```
End User
  ↓
[Sign In Button]
  ↓
Google OAuth 2.0 (Client ID)
  ↓
Your App
  ↓
Clerk (Session Management)
  ↓
(Service Account powers backend operations)
```

---

## Advanced: Automation Scripts

### Complete Automated Setup Script

```bash
#!/bin/bash
# complete-phase1-setup.sh

set -e

PROJECT_ID="REDACTED"
SERVICE_ACCOUNT_NAME="oauth-admin"
SERVICE_ACCOUNT_FULL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=================================="
echo "Phase 1: GCP OAuth Setup (Automated)"
echo "=================================="

# Step 1: Set project
echo ""
echo "1️⃣  Setting GCP project..."
gcloud config set project $PROJECT_ID --quiet
gcloud projects describe $PROJECT_ID > /dev/null
echo "   ✅ Project: $PROJECT_ID"

# Step 2: Enable APIs
echo ""
echo "2️⃣  Enabling required APIs..."
APIs=(
  "cloudresourcemanager.googleapis.com"
  "serviceusage.googleapis.com"
  "iam.googleapis.com"
  "iap.googleapis.com"
)

for api in "${APIs[@]}"; do
  gcloud services enable "$api" --project=$PROJECT_ID --quiet 2>/dev/null || true
done
echo "   ✅ APIs enabled"

# Step 3: Create service account
echo ""
echo "3️⃣  Creating service account..."
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --display-name="OAuth Configuration Manager" \
  --project=$PROJECT_ID \
  --quiet 2>/dev/null || echo "   ℹ️  Service account already exists"
echo "   ✅ Service account: $SERVICE_ACCOUNT_FULL"

# Step 4: Grant IAM role
echo ""
echo "4️⃣  Assigning IAM roles..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_FULL}" \
  --role="roles/iam.securityAdmin" \
  --quiet 2>/dev/null || true
echo "   ✅ Role: roles/iam.securityAdmin"

# Step 5: Verify
echo ""
echo "5️⃣  Verification..."
ACCOUNT=$(gcloud iam service-accounts describe $SERVICE_ACCOUNT_FULL --format="value(email)" 2>/dev/null)
echo "   ✅ Service account verified: $ACCOUNT"

echo ""
echo "=================================="
echo "✅ Phase 1 Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Create OAuth Consent Screen (GCP Console)"
echo "2. Create OAuth 2.0 Client ID (GCP Console)"
echo "3. Add credentials to .env.local"
echo "4. Test locally: npm run dev"
```

### Save and run:

```bash
# Save the script
cat > scripts/complete-phase1.sh << 'EOF'
# [paste script above]
EOF

# Make executable
chmod +x scripts/complete-phase1.sh

# Run it
./scripts/complete-phase1.sh
```

---

## Appendix: gcloud Command Reference

### Useful gcloud Commands

```bash
# Project management
gcloud config set project PROJECT_ID
gcloud config get-value project
gcloud projects list
gcloud projects describe PROJECT_ID

# APIs
gcloud services enable SERVICE_NAME
gcloud services disable SERVICE_NAME
gcloud services list
gcloud services list --enabled
gcloud services describe SERVICE_NAME

# Service accounts
gcloud iam service-accounts list
gcloud iam service-accounts create NAME
gcloud iam service-accounts describe EMAIL
gcloud iam service-accounts delete EMAIL

# Keys
gcloud iam service-accounts keys list \
  --iam-account=EMAIL
gcloud iam service-accounts keys create FILE.json \
  --iam-account=EMAIL
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=EMAIL

# IAM roles
gcloud projects get-iam-policy PROJECT_ID
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:EMAIL \
  --role=roles/ROLE_NAME
gcloud projects remove-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:EMAIL \
  --role=roles/ROLE_NAME

# Authentication
gcloud auth login
gcloud auth list
gcloud auth activate-service-account \
  --key-file=KEY_FILE.json
gcloud auth print-access-token
gcloud auth application-default login
```

---

## Summary

You've now set up the complete GCP OAuth infrastructure using the gcloud CLI:

| Component | Status | Command |
|-----------|--------|---------|
| GCP Project | ✅ Verified | `gcloud config set project REDACTED` |
| Cloud Resource Manager API | ✅ Enabled | `gcloud services enable cloudresourcemanager.googleapis.com` |
| Service Usage API | ✅ Enabled | `gcloud services enable serviceusage.googleapis.com` |
| IAM API | ✅ Enabled | `gcloud services enable iam.googleapis.com` |
| Cloud IAP API | ✅ Enabled | `gcloud services enable iap.googleapis.com` |
| Service Account | ✅ Created | `gcloud iam service-accounts create oauth-admin` |
| IAM Role | ✅ Assigned | `gcloud projects add-iam-policy-binding ... --role=roles/iam.securityAdmin` |

**Next:** Create OAuth credentials in GCP Console (still requires manual steps), then integrate with your app.

---

**Last Updated:** 2026-04-19  
**Status:** Complete & Verified ✅
