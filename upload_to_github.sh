#!/bin/bash

# Upload bundle_pos app to GitHub
# This script will create a GitHub repository and push the code

set -e

echo "🚀 Starting GitHub upload process for bundle_pos app..."

# Check if we're in the right directory
if [ ! -f "setup.py" ] || [ ! -f "README.md" ]; then
    echo "❌ Error: Not in the bundle_pos app directory"
    echo "Please run this script from the bundle_pos app directory"
    exit 1
fi

# Check git status
echo "📋 Checking git status..."
git status

# Check if remote already exists
if git remote | grep -q "origin"; then
    echo "📡 Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

# Create GitHub repository using GitHub CLI (if available)
echo "🏗️  Creating GitHub repository..."
if command -v gh &> /dev/null; then
    echo "Using GitHub CLI to create repository..."
    gh repo create bundle_pos --public --description "Dynamic Bundle Point of Sale System for ERPNext" --source=. --remote=origin --push
else
    echo "GitHub CLI not found. Adding remote manually..."
    # Add remote (assuming the repo exists on GitHub)
    git remote add origin https://github.com/poparab/bundle_pos.git
    
    # Set main branch
    git branch -M main
    
    # Push to GitHub
    echo "📤 Pushing to GitHub..."
    git push -u origin main
fi

echo "✅ Successfully uploaded bundle_pos app to GitHub!"
echo "🔗 Repository URL: https://github.com/poparab/bundle_pos"
echo ""
echo "Next steps:"
echo "1. Visit the repository on GitHub to verify the upload"
echo "2. Install the app on your site with: bench --site [site-name] install-app bundle_pos" 