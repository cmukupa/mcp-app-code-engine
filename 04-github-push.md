# Step 4 — Push Code to GitHub

This guide pushes both apps to `https://github.com/cmukupa/mcp-app-code-engine`.

---

## 4.1 Initialize the Root Repository

```bash
# Navigate to the directory that contains both app folders
# (the root of your mcp-codeengine-guide folder, or your project root)
cd /path/to/your/project

# Initialize Git if not already done
git init
git branch -M main
```

---

## 4.2 Create a Root `.gitignore`

Create a file named `.gitignore` at the project root:

```
# Dependencies
node_modules/
**/node_modules/

# Build output
build/
**/build/

# Secrets — NEVER commit these
.env
**/.env
*.env

# OS artefacts
.DS_Store
Thumbs.db
```

---

## 4.3 Review What Will Be Committed

```bash
git status
```

You should see:
```
mcp-server/
  Dockerfile
  package.json
  tsconfig.json
  src/index.ts

chatbot-app/
  Dockerfile
  package.json
  tsconfig.json
  src/auth.ts
  src/refund.ts
  src/index.ts
```

`node_modules/` and `.env` must **not** appear. If they do, fix your `.gitignore` before continuing.

---

## 4.4 Add and Commit All Files

```bash
git add .
git commit -m "feat: initial MCP server and chatbot app

- MCP server: process_refund and get_refund_status tools (HTTP transport)
- Chatbot app: JWT auth, refund chat flow, chat UI
- Both apps containerised with UBI9 Node 20 base images
- Ready for IBM Code Engine deployment"
```

---

## 4.5 Add the GitHub Remote and Push

```bash
# Add the remote (skip if already added)
git remote add origin https://github.com/cmukupa/mcp-app-code-engine.git

# Push
git push -u origin main
```

If the push is rejected (non-fast-forward because the repo has existing commits):
```bash
git pull --rebase origin main
git push origin main
```

---

## 4.6 Verify on GitHub

Open https://github.com/cmukupa/mcp-app-code-engine in your browser and confirm you see:
- `mcp-server/` folder with `Dockerfile`, `package.json`, `tsconfig.json`, `src/`
- `chatbot-app/` folder with the same structure

---

## 4.7 Create GitHub Actions CI (Optional but Recommended)

Create `.github/workflows/ci.yml` for automatic build checks on every push:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-mcp-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mcp-server/package-lock.json
      - name: Install dependencies
        working-directory: mcp-server
        run: npm ci
      - name: Build TypeScript
        working-directory: mcp-server
        run: npm run build

  build-chatbot-app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: chatbot-app/package-lock.json
      - name: Install dependencies
        working-directory: chatbot-app
        run: npm ci
      - name: Build TypeScript
        working-directory: chatbot-app
        run: npm run build
```

Commit and push this file:
```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions build checks"
git push
```

---

## 4.8 Tag a Release for Code Engine Deployments

Code Engine can pull from a specific Git tag or branch. Tag your release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

Proceed to **05-code-engine-deploy.md**.
