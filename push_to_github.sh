#!/bin/bash

echo "🚀 Pushing Bundle POS app to GitHub..."

# Navigate to the app directory
cd "$(dirname "$0")"

# Check current status
echo "📋 Current git status:"
git status

# Add all files
echo "📁 Adding all files..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Initial commit: Bundle POS app with core functionality

Features implemented:
- Customer search by name, phone, email
- Add/remove items from cart with customer validation
- POS opening and closing entries
- POS profiles with full configuration
- Accounting and inventory integration
- Full-screen responsive mode
- Bundle item support
- Real-time stock validation
- Multiple payment methods
- Session management"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

echo "✅ Successfully pushed Bundle POS app to GitHub!"
echo "🔗 Repository: https://github.com/poparab/bundle_pos"

echo ""
echo "Next steps:"
echo "1. Install the app: bench get-app https://github.com/poparab/bundle_pos.git"
echo "2. Install on site: bench --site [site-name] install-app bundle_pos"
echo "3. Create Bundle POS Profile and start using!" 