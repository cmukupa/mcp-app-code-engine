# Complete Guide: MCP Server + Chatbot on IBM Code Engine with Watson Orchestrate Integration

This folder contains everything you need to:

1. Build and deploy an MCP server to IBM Code Engine
2. Build and deploy a JWT-secured chatbot app (with refund flow) to IBM Code Engine
3. Push all code to GitHub (`https://github.com/cmukupa/mcp-app-code-engine`)
4. Integrate the MCP server with IBM Watson Orchestrate

---

## Folder Structure

```
mcp-codeengine-guide/
├── README.md                         ← This file (start here)
├── 01-prerequisites.md               ← Tools and accounts you need before starting
├── 02-mcp-server-build.md            ← Step-by-step: build the MCP server
├── 03-chatbot-app-build.md           ← Step-by-step: build the chatbot app
├── 04-github-push.md                 ← Step-by-step: push code to GitHub
├── 05-code-engine-deploy.md          ← Step-by-step: deploy both apps to Code Engine
├── 06-orchestrate-integration.md     ← Step-by-step: integrate MCP with Watson Orchestrate
├── mcp-server/                       ← MCP server source code
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── src/
│       └── index.ts
└── chatbot-app/                      ← Chatbot app source code
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile
    └── src/
        ├── index.ts
        ├── auth.ts
        └── refund.ts
```

---

## Quick-Start Order

Follow the numbered guides in order:

```
01 → 02 → 03 → 04 → 05 → 06
```
