# Step 5 — Deploy Both Apps to IBM Code Engine

This guide deploys the MCP server and the chatbot app as Code Engine **applications**
(long-running HTTPS services with auto-scaling).

---

## 5.1 Log In and Target the Project

```bash
ibmcloud login --sso
ibmcloud target -g Default          # your resource group
ibmcloud ce project select --name sigma-project
```

---

## 5.2 Create an IBM Container Registry (ICR) Pull Secret

Code Engine needs credentials to pull images from your private ICR namespace.

```bash
# Create an IAM API key for the pull secret
ibmcloud iam api-key-create sigma-icr-key \
  --description "Pull secret for sigma Code Engine project" \
  -f sigma-icr-key.json

# Store the API key value (from the JSON file)
ICR_API_KEY=$(jq -r .apikey sigma-icr-key.json)

# Create the registry secret in Code Engine
ibmcloud ce registry create \
  --name sigma-icr \
  --server us.icr.io \
  --username iamapikey \
  --password "$ICR_API_KEY"

# Delete the local key file — never keep secrets on disk
rm sigma-icr-key.json
```

---

## 5.3 Build and Push Docker Images

If you haven't already (from guide 02 and 03):

```bash
# Log in to ICR
ibmcloud cr login

# MCP server
cd mcp-server
docker build -t us.icr.io/sigma-ns/sigma-mcp-server:latest .
docker push us.icr.io/sigma-ns/sigma-mcp-server:latest
cd ..

# Chatbot app
cd chatbot-app
docker build -t us.icr.io/sigma-ns/sigma-chatbot:latest .
docker push us.icr.io/sigma-ns/sigma-chatbot:latest
cd ..
```

---

## 5.4 Deploy the MCP Server

### 5.4.1 Create a secret for the MCP API key

```bash
# Generate a strong, random API key
MCP_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "Your MCP_API_KEY is: $MCP_API_KEY"
# Save this value — you will need it when deploying the chatbot app and configuring Orchestrate

ibmcloud ce secret create \
  --name sigma-mcp-secrets \
  --from-literal MCP_API_KEY="$MCP_API_KEY"
```

### 5.4.2 Deploy the application

```bash
ibmcloud ce application create \
  --name sigma-mcp-server \
  --image us.icr.io/sigma-ns/sigma-mcp-server:latest \
  --registry-secret sigma-icr \
  --env-from-secret sigma-mcp-secrets \
  --port 8080 \
  --cpu 0.5 \
  --memory 1G \
  --min-scale 1 \
  --max-scale 5
```

### 5.4.3 Get the MCP server URL

```bash
ibmcloud ce application get --name sigma-mcp-server --output url
# Example output:
# https://sigma-mcp-server.<random>.us-south.codeengine.appdomain.cloud
```

Save this URL as `MCP_SERVER_URL` — you need it next.

### 5.4.4 Verify the MCP server

```bash
MCP_SERVER_URL=<url-from-above>

# Health check (no auth)
curl "$MCP_SERVER_URL/health"

# List tools (with API key)
curl -s -X POST "$MCP_SERVER_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq .
```

---

## 5.5 Deploy the Chatbot App

### 5.5.1 Generate a strong JWT secret

```bash
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
```

### 5.5.2 Create secrets for the chatbot

```bash
ibmcloud ce secret create \
  --name sigma-chatbot-secrets \
  --from-literal JWT_SECRET="$JWT_SECRET" \
  --from-literal MCP_API_KEY="$MCP_API_KEY"
```

### 5.5.3 Create a config map for the MCP server URL

```bash
ibmcloud ce configmap create \
  --name sigma-chatbot-config \
  --from-literal MCP_SERVER_URL="$MCP_SERVER_URL"
```

### 5.5.4 Deploy the application

```bash
ibmcloud ce application create \
  --name sigma-chatbot \
  --image us.icr.io/sigma-ns/sigma-chatbot:latest \
  --registry-secret sigma-icr \
  --env-from-secret sigma-chatbot-secrets \
  --env-from-configmap sigma-chatbot-config \
  --port 8080 \
  --cpu 0.5 \
  --memory 1G \
  --min-scale 1 \
  --max-scale 10
```

### 5.5.5 Get the chatbot URL

```bash
ibmcloud ce application get --name sigma-chatbot --output url
# Example:
# https://sigma-chatbot.<random>.us-south.codeengine.appdomain.cloud
```

Open this URL in your browser — you should see the Sigma Support Chatbot UI.

---

## 5.6 Test the End-to-End Flow

```bash
CHATBOT_URL=<chatbot-url-from-above>

# 1. Log in and get a JWT
TOKEN=$(curl -s -X POST "$CHATBOT_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"<YOUR_DEMO_PASSWORD>"}' | jq -r .token)

echo "Token acquired: ${TOKEN:0:40}..."

# 2. Send a refund request via the chatbot
curl -s -X POST "$CHATBOT_URL/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "I want a refund for order ORD-9876 of $49.99 because the item arrived broken"
  }' | jq .
```

Expected:
```json
{
  "reply": "I've submitted a refund request for order ORD-9876. Your refund ID is RF-XXXX and the current status is pending. You'll be notified once it's reviewed."
}
```

---

## 5.7 Update a Deployment After Code Changes

After pushing new Docker images:

```bash
# MCP server
ibmcloud ce application update \
  --name sigma-mcp-server \
  --image us.icr.io/sigma-ns/sigma-mcp-server:latest

# Chatbot
ibmcloud ce application update \
  --name sigma-chatbot \
  --image us.icr.io/sigma-ns/sigma-chatbot:latest
```

Code Engine performs a rolling update with zero downtime.

---

## 5.8 Code Engine Application Specs Summary

| Application | CPU | Memory | Min Scale | Max Scale | Port |
|---|---|---|---|---|---|
| `sigma-mcp-server` | 0.5 vCPU | 1 GB | 1 | 5 | 8080 |
| `sigma-chatbot` | 0.5 vCPU | 1 GB | 1 | 10 | 8080 |

Adjust `--cpu`, `--memory`, `--min-scale`, and `--max-scale` based on your actual load.

---

Proceed to **06-orchestrate-integration.md**.
