# GitHub Setup Guide

This guide helps you set up a clean GitHub repository for the Creerlio Platform.

## Step 1: Delete Old GitHub Account (If Needed)

If you need to start fresh:

1. Go to [GitHub Settings](https://github.com/settings/admin)
2. Navigate to **Account** → **Delete your account**
3. Follow the prompts to confirm deletion
4. Wait for the deletion process to complete

## Step 2: Create New GitHub Account

1. Go to [GitHub Sign Up](https://github.com/join)
2. Choose a username
3. Enter your email
4. Create a password
5. Verify your email address

## Step 3: Install Git and VS Code

### Install Git

**Windows:**
- Download from [git-scm.com](https://git-scm.com/download/win)
- Or use: `winget install Git.Git`

**macOS:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt-get install git
```

### Install VS Code

- Download from [code.visualstudio.com](https://code.visualstudio.com)
- Or use package manager:
  - Windows: `winget install Microsoft.VisualStudioCode`
  - macOS: `brew install --cask visual-studio-code`

## Step 4: Configure Git

```bash
# Set your name and email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

## Step 5: Create New Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Repository name: `creerlio-platform`
4. Description: "Multi-component platform for business, talent, and mapping solutions"
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **Create repository**

## Step 6: Connect VS Code to GitHub

### Install GitHub Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "GitHub Pull Requests and Issues"
4. Click **Install**

### Authenticate with GitHub

1. Open Command Palette (Ctrl+Shift+P)
2. Type: `Git: Clone`
3. Enter your repository URL: `https://github.com/your-username/creerlio-platform.git`
4. Choose a local folder
5. VS Code will prompt you to authenticate with GitHub
6. Follow the authentication flow

## Step 7: Initialize Local Repository

```bash
# Navigate to your project directory
cd Creerlio_V2/creerlio-platform

# Initialize git repository
git init

# Add remote repository
git remote add origin https://github.com/your-username/creerlio-platform.git

# Verify remote
git remote -v
```

## Step 8: First Commit

```bash
# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Creerlio Platform

- AI-powered resume parsing
- Business and talent profile management
- Mapping and route calculation
- Portfolio editor
- PDF generation
- Azure deployment ready"

# Push to GitHub
git push -u origin main
```

If you get an error about branch name, use:

```bash
# Check current branch
git branch

# If on 'master', rename to 'main'
git branch -M main

# Then push
git push -u origin main
```

## Step 9: Set Up VS Code Workspace

1. Open VS Code in the project directory
2. File → **Add Folder to Workspace**
3. Select `Creerlio_V2/creerlio-platform`
4. File → **Save Workspace As** → `creerlio-platform.code-workspace`

## Step 10: Configure .gitignore

The project already includes a `.gitignore` file that excludes:
- Python virtual environments
- Node modules
- Environment files (.env)
- IDE configurations
- Database files
- Build artifacts

**Important**: Never commit `.env` files with API keys!

## Step 11: Set Up Branch Protection (Optional)

For production repositories:

1. Go to repository **Settings** → **Branches**
2. Add rule for `main` branch
3. Enable:
   - Require pull request reviews
   - Require status checks
   - Require branches to be up to date

## Step 12: Add Repository Description

Update your repository description and topics:

1. Go to repository **Settings** → **General**
2. Add description: "Multi-component platform for business, talent, and mapping solutions with AI-powered resume parsing"
3. Add topics: `python`, `fastapi`, `nextjs`, `ai`, `mapping`, `azure`, `resume-parsing`

## Step 13: Create README Badges (Optional)

Add to your README.md:

```markdown
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
```

## Step 14: Set Up GitHub Actions (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      - name: Run tests
        run: |
          # Add your test commands here
          echo "Tests would run here"
```

## Troubleshooting

### Authentication Issues

```bash
# Use Personal Access Token instead of password
# Generate token: GitHub Settings → Developer settings → Personal access tokens
git remote set-url origin https://YOUR_TOKEN@github.com/username/repo.git
```

### Push Rejected

```bash
# If remote has content, pull first
git pull origin main --allow-unrelated-histories

# Then push
git push -u origin main
```

### VS Code Git Issues

1. Check Git is installed: `git --version`
2. Reload VS Code window: Ctrl+Shift+P → "Reload Window"
3. Check Git path in VS Code settings

## Next Steps

1. ✅ Repository is set up
2. ✅ Code is pushed to GitHub
3. ✅ VS Code is connected
4. 📝 Add collaborators (if needed)
5. 📝 Set up CI/CD pipeline
6. 📝 Configure GitHub Pages (if needed)
7. 📝 Add issue templates
8. 📝 Create pull request template

## Useful Git Commands

```bash
# Check status
git status

# View commit history
git log --oneline

# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# Merge branch
git merge feature/new-feature

# Push branch
git push origin feature/new-feature

# Pull latest changes
git pull origin main
```

## Security Best Practices

1. ✅ Never commit `.env` files
2. ✅ Use `.gitignore` properly
3. ✅ Use Personal Access Tokens (not passwords)
4. ✅ Enable 2FA on GitHub account
5. ✅ Review changes before committing
6. ✅ Use descriptive commit messages

## Support

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com)
- [VS Code Git Guide](https://code.visualstudio.com/docs/editor/versioncontrol)

---

Your Creerlio Platform is now on GitHub! 🎉


