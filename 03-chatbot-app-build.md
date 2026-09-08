# Step 3 — Build the Chatbot App

This guide walks you through building the JWT-secured chatbot application that:
- Provides a web UI for users to chat and request refunds
- Issues and validates JWT tokens for authentication
- Calls the MCP server's `process_refund` tool on behalf of the user
- Runs as a container on IBM Code Engine

---

## 3.1 Create the Project Directory

```bash
# From the root of your mcp-app-code-engine repo
mkdir -p chatbot-app/src
cd chatbot-app
```

---

## 3.2 Initialize the Node.js Project

```bash
npm init -y
```

Install dependencies:
```bash
npm install express jsonwebtoken zod
npm install -D @types/node @types/express @types/jsonwebtoken typescript
```

---

## 3.3 Project Files

All source files are pre-created in `chatbot-app/src/`:

| File | Purpose |
|---|---|
| `src/index.ts` | Express server: serves the chat UI and REST API |
| `src/auth.ts` | JWT issue / verify helpers |
| `src/refund.ts` | Calls the MCP server to process a refund |

The complete files are in `chatbot-app/src/` in this folder.

---

## 3.4 Application API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | None | Issue a JWT given username + password |
| `GET` | `/` | None | Serve the chat UI (HTML) |
| `POST` | `/chat` | Bearer JWT | Handle a chat message; triggers refund if requested |
| `GET` | `/health` | None | Liveness probe for Code Engine |

### Authentication Flow

```
User → POST /auth/login { username, password }
     ← { token: "<jwt>" }

User → POST /chat
         Authorization: Bearer <jwt>
         { message: "I want a refund for order 12345" }
     ← { reply: "Refund RF-XXXX submitted. Status: pending." }
```

---

## 3.5 Environment Variables

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret used to sign/verify JWTs (min 32 chars) |
| `MCP_SERVER_URL` | Full URL of the deployed MCP server (e.g. `https://mcp-app-code-engine-mcp.<region>.codeengine.appdomain.cloud`) |
| `MCP_API_KEY` | API key for the MCP server (`X-API-Key` header) |
| `PORT` | Port to listen on (default: `8080`) |

---

## 3.6 Build the TypeScript

```bash
npm run build
```

---

## 3.7 Test Locally

```bash
# Set environment variables
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
export MCP_SERVER_URL=http://localhost:8080
export MCP_API_KEY=test-key

# Run (with MCP server also running in a separate terminal)
node build/index.js
```

In a second terminal, test the full flow:

```bash
# 1. Get a JWT
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"<YOUR_DEMO_PASSWORD>"}' | jq -r .token)

echo "Token: $TOKEN"

# 2. Send a refund chat message
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"I want a refund for order ORD-9876 of $29.99 because the item was damaged"}' | jq .
```

Expected response:
```json
{
  "reply": "I've submitted a refund request for order ORD-9876. Your refund ID is RF-XXXX and the current status is pending. You'll be notified once it's reviewed."
}
```

---

## 3.8 Build and Push the Docker Image

```bash
# From inside chatbot-app/
docker build -t mcp-app-code-engine-chatbot:latest .

# Tag and push
docker tag mcp-app-code-engine-chatbot:latest us.icr.io/mcp-app-code-engine-ns/mcp-app-code-engine-chatbot:latest
docker push us.icr.io/mcp-app-code-engine-ns/mcp-app-code-engine-chatbot:latest

# Verify
ibmcloud cr image-list --restrict mcp-app-code-engine-ns
```

---

Proceed to **04-github-push.md**.
