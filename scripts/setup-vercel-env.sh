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
