#!/bin/bash

echo "🔧 Fixing GitHub sync issue and pushing Bundle POS app..."

# Navigate to the app directory
cd "$(dirname "$0")"

echo "📥 Pulling remote changes..."
git pull origin main --allow-unrelated-histories

# Check if there are any conflicts
if [ $? -eq 0 ]; then
    echo "✅ Remote changes merged successfully"
else
    echo "⚠️  Merge conflicts detected. Resolving..."
    # Add all files (this will mark conflicts as resolved)
    git add .
    git commit -m "Merge remote changes with local Bundle POS app"
fi

echo "📁 Adding all new files..."
git add .

echo "💾 Committing Bundle POS app..."
git commit -m "Add Bundle POS app with core functionality

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

echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed Bundle POS app to GitHub!"
    echo "🔗 Repository: https://github.com/poparab/bundle_pos"
    echo ""
    echo "Next steps:"
    echo "1. Install the app: bench get-app https://github.com/poparab/bundle_pos.git"
    echo "2. Install on site: bench --site [site-name] install-app bundle_pos"
    echo "3. Create Bundle POS Profile and start using!"
else
    echo "❌ Push failed. Please check the error messages above."
    echo "💡 You may need to resolve conflicts manually or use --force"
fi 