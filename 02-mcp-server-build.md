# Step 2 — Build the MCP Server

This guide walks you through building the MCP server that:
- Exposes a `process_refund` tool over HTTP (Streamable HTTP transport)
- Runs as a container on IBM Code Engine
- Is secured with an API key

---

## 2.1 Create the Project Directory

```bash
mkdir -p mcp-server/src
cd mcp-server
```

---

## 2.2 Initialize the Node.js Project

```bash
npm init -y
```

Install dependencies:
```bash
npm install @modelcontextprotocol/sdk zod express
npm install -D @types/node @types/express typescript
```

---

## 2.3 Create `package.json`

Replace the generated `package.json` with the following:

```json
{
  "name": "mcp-app-code-engine-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for refund processing on IBM Code Engine",
  "type": "module",
  "main": "build/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "dev": "tsc && node build/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.13.0",
    "express": "^5.1.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/node": "^24.0.0",
    "typescript": "^5.8.0"
  }
}
```

Run install again after editing:
```bash
npm install
```

---

## 2.4 Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## 2.5 Create `src/index.ts`

This is the full MCP server source. The complete file is in `mcp-server/src/index.ts` in this
folder. Key design decisions:

- Uses **Streamable HTTP transport** so Code Engine can route requests over HTTPS
- Reads `MCP_API_KEY` from the environment — requests missing this header get a `401`
- Binds to `127.0.0.1` inside the container (Code Engine terminates TLS at the edge)
- Exposes two tools: `process_refund` and `get_refund_status`

See the source file for the complete implementation.

---

## 2.6 Build the TypeScript

```bash
npm run build
```

Expected output: a `build/` folder containing `index.js`.

Verify locally:
```bash
MCP_API_KEY=test-key node build/index.js
# Should print: MCP server listening on 127.0.0.1:8080
```

Press `Ctrl+C` to stop.

---

## 2.7 Create `.gitignore`

```
node_modules/
build/
.env
*.env
```

---

## 2.8 Create the `Dockerfile`

The complete `Dockerfile` is in `mcp-server/Dockerfile` in this folder. It:
- Uses `registry.redhat.io/ubi9/nodejs-20-minimal:latest` as the base image
- Runs as a non-root user (uid 1001)
- Copies only the compiled `build/` output into the image

---

## 2.9 Build and Test the Docker Image Locally

```bash
# From inside mcp-server/
docker build -t mcp-app-code-engine-mcp-server:latest .

# Run locally
docker run --rm \
  -p 8080:8080 \
  -e MCP_API_KEY=test-key \
  mcp-app-code-engine-mcp-server:latest
```

In a second terminal, test it:
```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq .
```

Expected: a JSON response listing `process_refund` and `get_refund_status`.

---

## 2.10 Push the Image to IBM Container Registry

```bash
# Log in to IBM Container Registry
ibmcloud cr login

# Tag the image
docker tag mcp-app-code-engine-mcp-server:latest us.icr.io/mcp-app-code-engine-ns/mcp-app-code-engine-mcp-server:latest

# Push
docker push us.icr.io/mcp-app-code-engine-ns/mcp-app-code-engine-mcp-server:latest

# Verify
ibmcloud cr image-list --restrict mcp-app-code-engine-ns
```

---

## 2.11 What the MCP Server Exposes

| Tool | Description | Required Inputs |
|---|---|---|
| `process_refund` | Initiates a refund for an order | `order_id`, `amount`, `reason` |
| `get_refund_status` | Returns the status of an existing refund | `refund_id` |

These tools will be called by Watson Orchestrate agents in guide **06**.

---

Proceed to **03-chatbot-app-build.md**.
