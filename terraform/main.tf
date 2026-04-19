terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  default = "dfl-auth-25a"
}

variable "app_name" {
  default = "Nuwrrrld"
}

provider "google" {
  project = var.project_id
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "iap.googleapis.com",
    "iam.googleapis.com"
  ])

  service            = each.value
  disable_on_destroy = false
}

# Create OAuth Consent Screen
resource "google_identity_platform_oauth_idp_config" "google" {
  project         = var.project_id
  display_name    = "Google"
  type            = "GOOGLE"
  enabled         = true

  client_id     = google_oauth2_client_id.web.client_id
  client_secret = google_oauth2_client_id.web.client_secret

  depends_on = [google_project_service.required_apis]
}

# Create OAuth 2.0 Client ID
resource "google_oauth2_client_id" "web" {
  display_name = "Nuwrrrld OAuth Web Client"
  parent       = "projects/${var.project_id}"
  type         = "WEB"

  client_name       = var.app_name
  redirect_uris = [
    "http://localhost:3000/auth/callback/google",
    "http://localhost:19006/auth/callback/google",
    "https://clerk.accounts.com/oauth/callback/google",
  ]

  depends_on = [google_project_service.required_apis]
}

# Output the credentials
output "client_id" {
  value = google_oauth2_client_id.web.client_id
}

output "client_secret" {
  value     = google_oauth2_client_id.web.client_secret
  sensitive = true
}
