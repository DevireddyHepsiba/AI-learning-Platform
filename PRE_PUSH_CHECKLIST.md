# Pre-Push Git Checklist

Complete these checks BEFORE running `git push`:

---

## 1️⃣ Backend Checks

### A. Syntax & Linting
```bash
cd backend

# Check for syntax errors (JavaScript)
npm run lint  # If configured, else:
node -c server.js  # Syntax check

# Check specific file
node -c utils/CRDT.js
```

### B. Dependencies & Installation
```bash
# Check if all imports resolve
npm ls

# Verify no missing dependencies
npm audit  # Check for vulnerabilities

# Try building (if you have a build step)
npm run build  # If exists
```

### C. Environment Variables
```bash
# Verify .env file exists and has required vars
cat .env

# Should contain:
# - PORT=8000
# - MONGODB_URI=...
# - GOOGLE_CLIENT_ID=...
# - NODE_ENV=production or development (single instance!)
# - GEMINI_API_KEY=...
```

### D. Database Models
```bash
# Check if all models are valid JavaScript
node -c models/User.js
node -c models/DocumentHistory.js
node -c models/Session.js
# (check all model files)
```

### E. Routes
```bash
# Verify routes import correctly
node -c routes/advancedRoutes.js
node -c routes/authRoutes.js
# (check all route files)
```

### F. Start Server (Dry Run)
```bash
# Try to start without full app
node -e "require('./server.js')" & sleep 10 && kill $!

# Or test import
node -e "const app = require('./server.js'); console.log('✅ Server exported successfully')"
```

---

## 2️⃣ Frontend Checks

### A. Syntax & Linting
```bash
cd frontend/vite-project

# Check for syntax errors
npm run lint  # If configured

# Or check specific files
npx eslint src/utils/E2EEncryption.js
```

### B. Dependencies
```bash
# Check for missing dependencies
npm ls

# Verify all imports work
npm audit
```

### C. Check for Import Errors
```bash
# Test building (this catches import errors)
npm run build

# If build fails, check error messages carefully
```

### D. Check Vite Config
```bash
# Verify vite.config.js is valid
node -c vite.config.js
```

---

## 3️⃣ Quick Syntax Validation (All Files)

```bash
# Validate all JavaScript files in project
find backend -name "*.js" -exec node -c {} \;
find frontend/vite-project/src -name "*.js" -o -name "*.jsx" | xargs -I {} node -c {}
```

---

## 4️⃣ Git Pre-Push Commands

```bash
# Check git status before pushing
git status

# See what you're about to push
git log --oneline -n 5  # Last 5 commits

# See difference from main branch
git diff main  # What changed?

# See which files changed
git diff --name-only main  # List of files

# Show staged changes
git diff --cached
```

---

## 5️⃣ Full Pre-Push Script (Run This!)

```bash
#!/bin/bash

echo "🔍 PRE-PUSH VALIDATION"
echo "===================="

# 1. Check backend
echo "✓ Checking backend syntax..."
cd backend
find . -name "*.js" -exec node -c {} \; && echo "✅ Backend syntax OK" || { echo "❌ Backend syntax error"; exit 1; }
npm audit --audit-level=moderate && echo "✅ Dependencies safe" || { echo "⚠️  Vulnerability found"; }
cd ..

# 2. Check frontend
echo "✓ Checking frontend syntax..."
cd frontend/vite-project
find src -name "*.jsx" -o -name "*.js" | xargs -I {} node -c {} && echo "✅ Frontend syntax OK" || { echo "❌ Frontend syntax error"; exit 1; }
cd ../..

# 3. Check git status
echo "✓ Checking git status..."
git status
git diff --name-only

# 4. Show what will be pushed
echo "📦 Will push these commits:"
git log --oneline main..HEAD

echo ""
echo "✅ ALL CHECKS PASSED!"
echo "Safe to push with: git push origin main"
```

**Save as:** `pre-push-check.sh`

**Run:**
```bash
chmod +x pre-push-check.sh
./pre-push-check.sh
```

---

## 6️⃣ Quick Commands (Copy-Paste Ready)

### Backend Only
```bash
cd backend && find . -name "*.js" -exec node -c {} \; && npm audit && cd ..
```

### Frontend Only
```bash
cd frontend/vite-project && npm run build && cd ../..
```

### Both
```bash
echo "Checking backend..." && cd backend && find . -name "*.js" -exec node -c {} \; && cd .. && echo "Checking frontend..." && cd frontend/vite-project && npm run build && cd ../.. && echo "✅ Ready to push!"
```

### Git Only
```bash
git status && echo "" && echo "Changes:" && git diff --name-only && echo "" && echo "Commits to push:" && git log --oneline main..HEAD
```

---

## 7️⃣ Common Issues to Check

### ❌ Duplicate NODE_ENV
```bash
# BAD (will cause issues)
cd backend && grep -n "NODE_ENV" .env

# GOOD (only 1 line)
NODE_ENV=production
```

### ❌ Missing .env Variables
```bash
# Check required variables exist
grep "MONGODB_URI\|GOOGLE_CLIENT_ID\|PORT" backend/.env
```

### ❌ Syntax Errors in New Files
```bash
# Test all new files
node -c frontend/vite-project/src/utils/E2EEncryption.js
node -c frontend/vite-project/src/utils/PerformanceMonitor.js
node -c backend/routes/advancedRoutes.js
```

### ❌ Import Path Errors
```bash
# Try to build (catches import errors)
cd frontend/vite-project && npm list  # See dependency tree
```

---

## 8️⃣ Step-by-Step Before Each Push

```
1. [ ] Run syntax check: find . -name "*.js" -exec node -c {} \;
2. [ ] Check npm audit: npm audit
3. [ ] Review git diff: git diff
4. [ ] Review files changed: git diff --name-only
5. [ ] See commits to push: git log --oneline main..HEAD
6. [ ] Check git status: git status
7. [ ] If all green → git push origin main
8. [ ] If errors → fix them first → repeat from step 1
```

---

## ✅ Ready to Push Checklist

- [ ] No syntax errors (node -c check passed)
- [ ] No npm vulnerabilities (npm audit passed)
- [ ] .env file is correct (no duplicate NODE_ENV)
- [ ] All imports resolve correctly
- [ ] Frontend builds successfully
- [ ] Backend can start without errors
- [ ] Git diff reviewed (nothing accidental)
- [ ] Commit messages are clear
- [ ] No console.log() left in production code
- [ ] No API keys in code

---

## 🚀 Safe Push Command

```bash
# Do this:
git add .
git commit -m "Feature: Brief description of changes"
git push origin main

# Don't do this:
git push --force  # Dangerous!
```

---

## 🆘 If Push Fails

```bash
# Pull latest changes first
git pull origin main

# If conflicts, resolve them, then:
git add .
git commit -m "Merge: Resolve conflicts"
git push origin main
```

---

## Example: Full Validation Before Push

```bash
# Terminal 1: Backend check
cd backend
node -c server.js && node -c utils/CRDT.js && npm audit
cd ..

# Terminal 2: Frontend check  
cd frontend/vite-project
npm run build
cd ../..

# Terminal 3: Git check
git status
git diff --name-only
git log --oneline main..HEAD

# If all ✅ → git push origin main
```

---

## 📝 Notes

- Always check syntax before pushing
- Never push with console.error() containing sensitive data
- Verify .env file before pushing (no duplicates!)
- Test building catches most import errors
- Use `git diff` to review your exact changes
- Small, focused commits are easier to debug

**Pro Tip:** Create a git pre-push hook to run checks automatically!

```bash
# Create: .git/hooks/pre-push
#!/bin/bash
find backend -name "*.js" -exec node -c {} \; || exit 1
echo "✅ Backend syntax OK"
```
