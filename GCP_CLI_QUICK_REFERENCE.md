# GCP CLI Quick Reference

**Fast lookup for gcloud commands used in Phase 1 setup.**

---

## One-Liner Setup

```bash
# Copy and paste this to set up everything at once:
gcloud config set project REDACTED && \
gcloud services enable cloudresourcemanager.googleapis.com serviceusage.googleapis.com iam.googleapis.com iap.googleapis.com --quiet && \
gcloud iam service-accounts create oauth-admin --display-name="OAuth Configuration Manager" --quiet 2>/dev/null || true && \
gcloud projects add-iam-policy-binding REDACTED --member="serviceAccount:oauth-admin@REDACTED.iam.gserviceaccount.com" --role="roles/iam.securityAdmin" --quiet
```

---

## Step-by-Step Commands

### 1. Set Project
```bash
gcloud config set project REDACTED
```

### 2. Enable APIs
```bash
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable serviceusage.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable iap.googleapis.com
```

Or all at once:
```bash
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  iam.googleapis.com \
  iap.googleapis.com \
  --quiet
```

### 3. Create Service Account
```bash
gcloud iam service-accounts create oauth-admin \
  --display-name="OAuth Configuration Manager"
```

### 4. Grant IAM Role
```bash
gcloud projects add-iam-policy-binding REDACTED \
  --member="serviceAccount:oauth-admin@REDACTED.iam.gserviceaccount.com" \
  --role="roles/iam.securityAdmin"
```

---

## Verification Commands

### Check Current Project
```bash
gcloud config get-value project
```

### Describe Project
```bash
gcloud projects describe REDACTED
```

### List Enabled APIs
```bash
gcloud services list --enabled
```

### Check Specific APIs
```bash
gcloud services list --enabled | grep -E "cloudresource|serviceusage|iam|iap"
```

### List Service Accounts
```bash
gcloud iam service-accounts list
```

### Describe Service Account
```bash
gcloud iam service-accounts describe oauth-admin@REDACTED.iam.gserviceaccount.com
```

### Check IAM Bindings
```bash
gcloud projects get-iam-policy REDACTED \
  --flatten="bindings[].members" \
  --filter="bindings.members:oauth-admin@REDACTED.iam.gserviceaccount.com"
```

---

## Common Flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--quiet` | Skip prompts | `--quiet` |
| `--project` | Specify project | `--project=REDACTED` |
| `--format` | Output format | `--format=json` |
| `--filter` | Filter results | `--filter="name:cloudresource"` |
| `--flatten` | Flatten nested data | `--flatten="bindings[].members"` |

---

## Helpful Output Formats

```bash
# JSON format (parse with jq)
gcloud projects describe REDACTED --format=json

# CSV format
gcloud services list --format=csv

# Table format (default, human-readable)
gcloud services list --format=table

# Value format (just the value)
gcloud config get-value project --format=value
```

---

## Troubleshooting One-Liners

```bash
# Check if you're authenticated
gcloud auth list

# Re-authenticate
gcloud auth login

# Get your current user
gcloud config get-value account

# Check project access
gcloud projects describe REDACTED

# List your projects
gcloud projects list

# Check active configuration
gcloud config list

# Reset to defaults
gcloud config reset
```

---

## Service Account Operations

### List Service Accounts
```bash
gcloud iam service-accounts list
```

### Create Service Account
```bash
gcloud iam service-accounts create NAME \
  --display-name="DISPLAY_NAME"
```

### Delete Service Account
```bash
gcloud iam service-accounts delete EMAIL
```

### List Keys
```bash
gcloud iam service-accounts keys list \
  --iam-account=EMAIL
```

### Create Key
```bash
gcloud iam service-accounts keys create FILE.json \
  --iam-account=EMAIL
```

### Delete Key
```bash
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=EMAIL
```

---

## IAM Role Management

### List Current IAM Policy
```bash
gcloud projects get-iam-policy REDACTED
```

### Add IAM Binding
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:EMAIL \
  --role=roles/ROLE_NAME
```

### Remove IAM Binding
```bash
gcloud projects remove-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:EMAIL \
  --role=roles/ROLE_NAME
```

### Common Roles
- `roles/iam.securityAdmin` — IAM security management
- `roles/iam.serviceAccountAdmin` — Service account management
- `roles/iam.serviceKeyAdmin` — Service account key management
- `roles/editor` — Full edit access
- `roles/viewer` — Read-only access

---

## API Management

### List All Available APIs
```bash
gcloud services list --available
```

### List Enabled APIs
```bash
gcloud services list --enabled
```

### Enable Service
```bash
gcloud services enable SERVICE_NAME
```

### Disable Service
```bash
gcloud services disable SERVICE_NAME
```

### Get Service Details
```bash
gcloud services describe SERVICE_NAME
```

### Common Service Names
- `cloudresourcemanager.googleapis.com`
- `serviceusage.googleapis.com`
- `iam.googleapis.com`
- `iap.googleapis.com`
- `oauth2.googleapis.com`

---

## Configuration Management

### View Current Config
```bash
gcloud config list
```

### Set Value
```bash
gcloud config set KEY VALUE
```

### Get Value
```bash
gcloud config get-value KEY
```

### Unset Value
```bash
gcloud config unset KEY
```

### Common Keys
- `project` — Active GCP project
- `account` — Active Google account
- `disable_usage_reporting` — Disable analytics

---

## Authentication

### Login
```bash
gcloud auth login
```

### Logout
```bash
gcloud auth revoke
```

### List Accounts
```bash
gcloud auth list
```

### Switch Account
```bash
gcloud config set account EMAIL@gmail.com
```

### Get Access Token
```bash
gcloud auth print-access-token
```

### Application Default Credentials
```bash
gcloud auth application-default login
```

---

## Useful Bash Scripts

### Status Check Script
```bash
#!/bin/bash
PROJECT="REDACTED"

echo "=== GCP Status ==="
echo "Project: $(gcloud config get-value project)"
echo "Account: $(gcloud config get-value account)"
echo ""
echo "=== Enabled APIs ==="
gcloud services list --enabled | head -5
echo ""
echo "=== Service Accounts ==="
gcloud iam service-accounts list
```

### Enable Multiple APIs
```bash
#!/bin/bash
APIs=(
  "cloudresourcemanager.googleapis.com"
  "serviceusage.googleapis.com"
  "iam.googleapis.com"
  "iap.googleapis.com"
)

for api in "${APIs[@]}"; do
  echo "Enabling $api..."
  gcloud services enable "$api" --quiet
done
```

### Create and Configure Service Account
```bash
#!/bin/bash
PROJECT="REDACTED"
ACCOUNT="oauth-admin"

# Create
gcloud iam service-accounts create $ACCOUNT \
  --display-name="OAuth Configuration Manager"

# Assign role
gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${ACCOUNT}@${PROJECT}.iam.gserviceaccount.com" \
  --role="roles/iam.securityAdmin"

# List bindings
gcloud projects get-iam-policy $PROJECT \
  --flatten="bindings[].members" \
  --filter="bindings.members:${ACCOUNT}"
```

---

## Pro Tips

### Use --quiet for Automation
```bash
# Skip all confirmation prompts
gcloud services enable API_NAME --quiet
```

### Combine Multiple Commands
```bash
# Chain commands with &&
gcloud config set project REDACTED && \
gcloud projects describe REDACTED && \
gcloud services list --enabled
```

### Filter Output
```bash
# Find specific resources
gcloud iam service-accounts list --filter="displayName:oauth*"
gcloud services list --enabled --filter="name:resource*"
```

### Format for Scripting
```bash
# Get just the value (no headers)
gcloud config get-value project --format=value

# JSON for parsing with jq
gcloud iam service-accounts describe EMAIL --format=json | jq '.email'
```

### Check Quotas
```bash
gcloud compute project-info describe --project=REDACTED
```

---

## Error Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `Project not found` | Wrong project ID | Check: `gcloud projects list` |
| `Permission denied` | Insufficient role | Ask admin for Editor role |
| `Service account exists` | Already created | Safe to continue |
| `API not enabled` | Service not activated | `gcloud services enable NAME` |
| `Not authenticated` | Not logged in | `gcloud auth login` |

---

## Next Steps

After these commands:

1. ✅ **GCP Infrastructure ready**
2. ⏳ **Manual steps required:**
   - Create OAuth Consent Screen (GCP Console)
   - Create OAuth 2.0 Client ID (GCP Console)
3. ✅ **Add credentials to .env.local**
4. ✅ **Test your app locally**

See [GCP_CLI_SETUP_GUIDE.md](GCP_CLI_SETUP_GUIDE.md) for detailed explanations.

---

**Version:** 1.0  
**Last Updated:** 2026-04-19  
**Status:** Ready to use ✅
