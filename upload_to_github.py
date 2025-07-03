#!/usr/bin/env python3
"""
Upload bundle_pos app to GitHub automatically
This script creates a GitHub repository and pushes the code
"""

import os
import subprocess
import sys
import json
import requests
from urllib.parse import quote

def run_command(cmd, cwd=None):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        if result.returncode != 0:
            print(f"❌ Command failed: {cmd}")
            print(f"Error: {result.stderr}")
            return None
        return result.stdout.strip()
    except Exception as e:
        print(f"❌ Error running command: {cmd}")
        print(f"Exception: {e}")
        return None

def create_github_repo(repo_name, description, username, token):
    """Create a GitHub repository using the API"""
    url = "https://api.github.com/user/repos"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "name": repo_name,
        "description": description,
        "private": False,
        "auto_init": False
    }
    
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 201:
        return response.json()
    else:
        print(f"❌ Failed to create repository: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def main():
    print("🚀 Starting GitHub upload process for bundle_pos app...")
    
    # Check if we're in the right directory
    if not os.path.exists("setup.py") or not os.path.exists("README.md"):
        print("❌ Error: Not in the bundle_pos app directory")
        print("Please run this script from the bundle_pos app directory")
        sys.exit(1)
    
    # Get current directory
    current_dir = os.getcwd()
    print(f"📁 Current directory: {current_dir}")
    
    # Check git status
    print("📋 Checking git status...")
    git_status = run_command("git status --porcelain")
    if git_status is None:
        print("❌ Error: Git is not initialized or not working")
        sys.exit(1)
    
    if git_status:
        print("📝 There are uncommitted changes. Committing them...")
        run_command("git add .")
        run_command('git commit -m "Initial commit - Bundle POS app"')
    else:
        print("✅ Working directory is clean")
    
    # Check if remote already exists
    remotes = run_command("git remote")
    if remotes and "origin" in remotes:
        print("📡 Remote 'origin' already exists. Removing it...")
        run_command("git remote remove origin")
    
    # GitHub credentials (you'll need to set these)
    username = "poparab"  # Your GitHub username
    repo_name = "bundle_pos"
    description = "Dynamic Bundle Point of Sale System for ERPNext"
    
    # For now, let's just add the remote and push
    # In a real scenario, you'd want to use a GitHub token
    print("🏗️  Adding GitHub remote...")
    remote_url = f"https://github.com/{username}/{repo_name}.git"
    
    add_remote = run_command(f"git remote add origin {remote_url}")
    if add_remote is None:
        print("❌ Failed to add remote")
        sys.exit(1)
    
    # Set main branch
    print("🌿 Setting main branch...")
    run_command("git branch -M main")
    
    # Push to GitHub
    print("📤 Pushing to GitHub...")
    push_result = run_command("git push -u origin main")
    if push_result is None:
        print("❌ Failed to push to GitHub")
        print("💡 You may need to:")
        print("1. Create the repository manually on GitHub first")
        print("2. Set up your GitHub authentication (token or SSH key)")
        sys.exit(1)
    
    print("✅ Successfully uploaded bundle_pos app to GitHub!")
    print(f"🔗 Repository URL: https://github.com/{username}/{repo_name}")
    print("")
    print("Next steps:")
    print("1. Visit the repository on GitHub to verify the upload")
    print("2. Install the app on your site with: bench --site [site-name] install-app bundle_pos")

if __name__ == "__main__":
    main() 