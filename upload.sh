#!/bin/bash
# Simple GitHub upload script for bundle_pos app

echo "🚀 Uploading bundle_pos app to GitHub..."
echo "📁 Current directory: $(pwd)"

# Check if we're in the right directory
if [ ! -f "setup.py" ]; then
    echo "❌ Error: setup.py not found. Please run from bundle_pos directory."
    exit 1
fi

# Git commands
echo "📋 Checking git status..."
git status

echo "📡 Adding GitHub remote..."
git remote add origin https://github.com/poparab/bundle_pos.git

echo "🌿 Setting main branch..."
git branch -M main

echo "📤 Pushing to GitHub..."
git push -u origin main

echo "✅ Done! Visit: https://github.com/poparab/bundle_pos" 