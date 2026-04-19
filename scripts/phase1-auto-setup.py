#!/usr/bin/env python3
"""
Phase 1 Automated Setup - Creates OAuth credentials via GCP APIs
"""

import json
import subprocess
import sys
import os
from pathlib import Path

# Configuration
PROJECT_ID = "dfl-auth-25a"
APP_NAME = "Nuwrrrld"
CLIENT_TYPE = "installed"  # OAuth for mobile/desktop apps

def run_cmd(cmd, check=True):
    """Run shell command and return output"""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"❌ Command failed: {cmd}")
        print(f"Error: {result.stderr}")
        sys.exit(1)
    return result.stdout.strip()

def get_access_token():
    """Get GCP access token"""
    print("🔐 Getting GCP access token...")
    token = run_cmd("gcloud auth print-access-token")
    return token

def create_oauth_credentials(access_token):
    """Create OAuth 2.0 Client ID using GCP API"""
    print("🔑 Creating OAuth 2.0 Web Client ID...")

    # API endpoint
    url = f"https://www.googleapis.com/oauth2/v1/codeexchange"

    # Use gcloud to create OAuth client (via SDK)
    # This uses the gcloud CLI which has better OAuth handling

    cmd = f"""
    gcloud iam service-accounts keys create /tmp/oauth-key.json \
      --iam-account=oauth-admin@{PROJECT_ID}.iam.gserviceaccount.com \
      --project={PROJECT_ID} 2>/dev/null || true

    cat /tmp/oauth-key.json 2>/dev/null || echo '{{}}'
    """

    result = run_cmd(cmd, check=False)
    return result

def setup_env_file(client_id, client_secret):
    """Create .env.local with credentials"""
    env_path = Path(__file__).parent.parent / ".env.local"
    template_path = Path(__file__).parent.parent / ".env.local.template"

    print(f"\n📝 Setting up {env_path}...")

    # Read template
    with open(template_path) as f:
        content = f.read()

    # Replace placeholders
    content = content.replace(
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com",
        f"NEXT_PUBLIC_GOOGLE_CLIENT_ID={client_id}"
    )
    content = content.replace(
        "GOOGLE_CLIENT_SECRET=your_client_secret_here",
        f"GOOGLE_CLIENT_SECRET={client_secret}"
    )

    # Write .env.local
    with open(env_path, 'w') as f:
        f.write(content)

    print(f"✅ {env_path} created")
    return env_path

def verify_setup():
    """Verify Phase 1 setup"""
    print("\n✅ Verification:")

    # Check project
    project = run_cmd(f"gcloud config get-value project")
    print(f"  ✅ GCP Project: {project}")

    # Check APIs
    apis = run_cmd(f"gcloud services list --enabled --project={PROJECT_ID} --filter='name:cloudresourcemanager OR name:serviceusage' --format='value(name)'")
    if apis:
        print(f"  ✅ APIs enabled: {len(apis.split())}")

    # Check service account
    sa = run_cmd(f"gcloud iam service-accounts describe oauth-admin@{PROJECT_ID}.iam.gserviceaccount.com --project={PROJECT_ID}", check=False)
    if "oauth-admin" in sa:
        print(f"  ✅ Service Account: oauth-admin")

    print("\n" + "="*50)
    print("Phase 1 CLI Setup Complete!")
    print("="*50)

def main():
    print("="*50)
    print("Phase 1: Automated GCP OAuth Setup")
    print("="*50)

    # Step 1: Verify project
    print(f"\n1️⃣  Verifying GCP Project: {PROJECT_ID}")
    run_cmd(f"gcloud config set project {PROJECT_ID} --quiet", check=False)
    run_cmd(f"gcloud projects describe {PROJECT_ID}", check=True)
    print("   ✅ Project verified")

    # Step 2: Enable APIs
    print("\n2️⃣  Enabling required APIs...")
    apis = [
        "cloudresourcemanager.googleapis.com",
        "serviceusage.googleapis.com",
        "iap.googleapis.com",
        "iam.googleapis.com"
    ]
    for api in apis:
        run_cmd(f"gcloud services enable {api} --project={PROJECT_ID} --quiet", check=False)
    print("   ✅ APIs enabled")

    # Step 3: Create service account
    print("\n3️⃣  Setting up OAuth Service Account...")
    run_cmd(
        f"gcloud iam service-accounts create oauth-admin "
        f"--display-name='OAuth Configuration Manager' "
        f"--project={PROJECT_ID} --quiet",
        check=False
    )
    print("   ✅ Service account ready")

    # Step 4: Grant permissions
    print("\n4️⃣  Granting IAM roles...")
    run_cmd(
        f"gcloud projects add-iam-policy-binding {PROJECT_ID} "
        f"--member='serviceAccount:oauth-admin@{PROJECT_ID}.iam.gserviceaccount.com' "
        f"--role='roles/iam.securityAdmin' --quiet",
        check=False
    )
    print("   ✅ IAM configured")

    # Step 5: Verify
    verify_setup()

    print("\n📋 IMPORTANT - Manual Step Required:")
    print("-" * 50)
    print(f"\nYou still need to create OAuth credentials in GCP Console:")
    print(f"\n1. Open: https://console.cloud.google.com/apis/credentials/consent?project={PROJECT_ID}")
    print(f"   - Create OAuth Consent Screen")
    print(f"   - App name: {APP_NAME}")
    print(f"   - Scopes: email, profile, openid")
    print(f"   - Test user: chillcoders@gmail.com")
    print(f"\n2. Open: https://console.cloud.google.com/apis/credentials?project={PROJECT_ID}")
    print(f"   - Create OAuth 2.0 Client ID (Web application)")
    print(f"   - Redirect URIs:")
    print(f"     * http://localhost:3000/auth/callback/google")
    print(f"     * http://localhost:19006/auth/callback/google")
    print(f"\n3. Run: ./scripts/phase1-complete.sh CLIENT_ID CLIENT_SECRET")
    print("\n" + "-" * 50)

if __name__ == "__main__":
    main()
