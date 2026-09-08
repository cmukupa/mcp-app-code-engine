# Step 1 — Prerequisites

Complete every item in this checklist before proceeding to the next guide.

---

## 1.1 Accounts Required

| Account | Purpose | URL |
|---|---|---|
| IBM Cloud | Code Engine, Container Registry | https://cloud.ibm.com |
| IBM Watson Orchestrate | MCP integration | https://www.ibm.com/products/watson-orchestrate |
| GitHub | Source code hosting | https://github.com |

---

## 1.2 Local Tools to Install

### Node.js (v20 LTS or later)
```bash
# Verify
node --version    # must be >= 20.0.0
npm --version     # must be >= 9.0.0
```
Install from: https://nodejs.org

### IBM Cloud CLI
```bash
# macOS
curl -fsSL https://clis.cloud.ibm.com/install/osx | sh

# Verify
ibmcloud --version
```

Install the Code Engine plugin:
```bash
ibmcloud plugin install code-engine
ibmcloud plugin install container-registry

# Verify
ibmcloud ce --help
ibmcloud cr --help
```

### Docker Desktop
```bash
# Verify
docker --version
docker info   # daemon must be running
```
Install from: https://docs.docker.com/get-started/get-docker/

### Git
```bash
# Verify
git --version
```
Install from: https://git-scm.com/downloads

### GitHub CLI (optional but recommended)
```bash
# macOS
brew install gh

# Verify
gh --version
```

---

## 1.3 IBM Cloud Setup

### Log in
```bash
ibmcloud login --sso
# Follow the browser prompt, paste the one-time code back into the terminal
```

### Target a resource group
```bash
# List available resource groups
ibmcloud resource groups

# Target one (replace 'Default' with your group name)
ibmcloud target -g Default
```

### Create a Code Engine project (do this once)
```bash
ibmcloud ce project create --name mcp-app-code-engine-project
ibmcloud ce project select --name mcp-app-code-engine-project

# Verify
ibmcloud ce project current
```

### Create a Container Registry namespace
```bash
# Replace <region> with your nearest region, e.g. us-south
ibmcloud cr region-set us-south
ibmcloud cr namespace-add mcp-app-code-engine-ns

# Verify
ibmcloud cr namespace-list
```

---

## 1.4 GitHub Setup

### Configure Git identity (if not already done)
```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

### Authenticate GitHub CLI
```bash
gh auth login
# Choose GitHub.com → HTTPS → authenticate via browser
```

### Create the target repository (if it does not exist yet)
```bash
gh repo create cmukupa/mcp-app-code-engine --public --description "MCP Server + Chatbot on IBM Code Engine"
# If it already exists, skip this step
```

---

## 1.5 Environment Variables to Prepare

Collect these values before starting the build guides. Store them in a local `.env` file
(never commit this file to Git — `.gitignore` is pre-configured).

```bash
# IBM Cloud
IBM_CLOUD_API_KEY=<your-ibm-cloud-api-key>       # IAM → API Keys in IBM Cloud console
ICR_REGION=us.icr.io                              # or your region
ICR_NAMESPACE=mcp-app-code-engine-ns

# JWT secret for the chatbot app (generate a strong random value)
JWT_SECRET=<at-least-32-random-characters>

# Watson Orchestrate (filled in during guide 06)
ORCHESTRATE_API_KEY=<your-orchestrate-api-key>
ORCHESTRATE_INSTANCE_URL=<your-orchestrate-instance-url>
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 1.6 Checklist Before Continuing

- [ ] `node --version` returns v20+
- [ ] `ibmcloud ce project current` shows `mcp-app-code-engine-project`
- [ ] `ibmcloud cr namespace-list` shows `mcp-app-code-engine-ns`
- [ ] `docker info` succeeds (daemon running)
- [ ] `gh auth status` shows authenticated
- [ ] `.env` file created with all values above
- [ ] Repository `https://github.com/cmukupa/mcp-app-code-engine` exists

When all boxes are checked, proceed to **02-mcp-server-build.md**.
