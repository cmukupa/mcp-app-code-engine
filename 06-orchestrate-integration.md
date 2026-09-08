# Step 6 — Integrate the MCP Server with IBM Watson Orchestrate

This guide configures Watson Orchestrate to call your deployed MCP server's tools
(`process_refund`, `get_refund_status`) through the MCP skill provider.

---

## 6.1 What the Integration Looks Like

```
User (Orchestrate chat)
        │
        ▼
  Orchestrate Agent
        │  calls tool
        ▼
  MCP Skill Provider (built into Orchestrate)
        │  HTTP POST /mcp  +  X-API-Key
        ▼
  mcp-app-code-engine-mcp-server  (IBM Code Engine)
        │
        ▼
  Returns refund result to Agent
        │
        ▼
  Agent replies to user
```

---

## 6.2 Prerequisites

Before starting, confirm you have:
- [ ] The MCP server deployed and its URL (e.g. `https://mcp-app-code-engine-mcp-server.<id>.us-south.codeengine.appdomain.cloud`)
- [ ] The `MCP_API_KEY` value you set in guide 05
- [ ] Access to an IBM Watson Orchestrate instance with admin rights

---

## 6.3 Open the Watson Orchestrate Skills Catalog

1. Log in to your Watson Orchestrate instance at your provisioned URL.
2. In the left navigation, click **Skills and apps**.
3. Click **Add skills** → **From an MCP server**.

---

## 6.4 Register the MCP Server as a Skill Provider

In the "Add MCP server" dialog, enter the following:

| Field | Value |
|---|---|
| **Display name** | `Sigma Refund MCP` |
| **MCP server URL** | `https://mcp-app-code-engine-mcp-server.<id>.us-south.codeengine.appdomain.cloud/mcp` |
| **Authentication type** | `API Key` |
| **Header name** | `X-API-Key` |
| **API key value** | Your `MCP_API_KEY` value from guide 05 |

Click **Connect**. Orchestrate will call `tools/list` on your server and discover:
- `process_refund`
- `get_refund_status`

---

## 6.5 Review and Publish the Discovered Tools

After connecting:

1. You will see both tools listed with their descriptions and input schemas.
2. Review each tool:
   - **process_refund** — verify the three inputs: `order_id`, `amount`, `reason`
   - **get_refund_status** — verify the one input: `refund_id`
3. Toggle both tools to **Enabled**.
4. Click **Save and publish**.

The tools are now available to Orchestrate agents as skills.

---

## 6.6 Create a Refund Agent

Now create a Watson Orchestrate agent that uses these skills.

### 6.6.1 Navigate to Agents

1. In the left navigation, click **AI agents**.
2. Click **New agent**.

### 6.6.2 Configure the Agent

| Setting | Value |
|---|---|
| **Name** | `Refund Agent` |
| **Description** | `Handles customer refund requests and status enquiries` |
| **Model** | `ibm/granite-3-3-8b-instruct` (or your preferred model) |

### 6.6.3 Write the System Prompt

In the **Instructions** field, paste:

```
You are a helpful customer support agent specializing in refund requests.

When a user asks for a refund:
1. Ask for their order ID if not provided.
2. Ask for the refund amount if not provided.
3. Ask for the reason for the refund if not provided (minimum 10 characters).
4. Once you have all three pieces of information, call the process_refund tool.
5. Relay the refund ID and status back to the user.

When a user asks about the status of a refund:
1. Ask for the refund ID (format: RF-XXXX) if not provided.
2. Call the get_refund_status tool.
3. Relay the status and details back to the user.

Always be polite, empathetic, and professional.
```

### 6.6.4 Add Skills to the Agent

1. Scroll to the **Skills** section.
2. Click **Add skill**.
3. Search for `Sigma Refund MCP`.
4. Select both `process_refund` and `get_refund_status`.
5. Click **Add**.

### 6.6.5 Save the Agent

Click **Save and deploy**.

---

## 6.7 Test the Integration

### Via the Orchestrate Chat Preview

1. Click **Preview** on your Refund Agent.
2. Type: `I'd like a refund for order ORD-9876, $29.99, item arrived damaged.`
3. The agent should call `process_refund` and reply with a refund ID.

### Via the Orchestrate API (programmatic)

```bash
# Replace with your Orchestrate instance URL and API key
ORCHESTRATE_URL=https://<your-instance>.assistant.watson.cloud.ibm.com
ORCHESTRATE_API_KEY=<your-orchestrate-api-key>

# Start a session
SESSION=$(curl -s -X POST \
  "$ORCHESTRATE_URL/v2/assistants/<assistant-id>/sessions" \
  -H "Authorization: Bearer $ORCHESTRATE_API_KEY" \
  -H "Content-Type: application/json" | jq -r .session_id)

# Send a message
curl -s -X POST \
  "$ORCHESTRATE_URL/v2/assistants/<assistant-id>/sessions/$SESSION/message" \
  -H "Authorization: Bearer $ORCHESTRATE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "message_type": "text",
      "text": "I want a refund for order ORD-1234, $19.99, wrong item delivered"
    }
  }' | jq '.output.generic[0].text'
```

---

## 6.8 Publish the Agent to an Orchestrate Channel

To make the Refund Agent available to end users:

1. Go to **Channels** → **Web chat**.
2. Click **Create channel**.
3. Select your **Refund Agent**.
4. Copy the embed snippet and add it to your web application.

For the Sigma chatbot app integration, you can redirect users from the chatbot to the
Orchestrate web chat URL, or call the Orchestrate API directly from `chatbot-app/src/index.ts`.

---

## 6.9 Monitor Tool Calls in Orchestrate

1. Go to **Analytics** → **Conversations**.
2. Filter by your Refund Agent.
3. Click any conversation to see which tools were called, with inputs and outputs.

---

## 6.10 Rotate the MCP API Key

When you need to rotate the key:

1. Generate a new key:
   ```bash
   NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

2. Update the Code Engine secret:
   ```bash
   ibmcloud ce secret update \
     --name mcp-app-code-engine-mcp-secrets \
     --from-literal MCP_API_KEY="$NEW_KEY"

   ibmcloud ce secret update \
     --name mcp-app-code-engine-chatbot-secrets \
     --from-literal MCP_API_KEY="$NEW_KEY"
   ```

3. Trigger a rolling restart:
   ```bash
   ibmcloud ce application update --name mcp-app-code-engine-mcp-server --image us.icr.io/mcp-app-code-engine-ns/mcp-app-code-engine-mcp-server:latest
   ibmcloud ce application update --name mcp-app-code-engine-chatbot   --image us.icr.io/mcp-app-code-engine-ns/mcp-app-code-engine-chatbot:latest
   ```

4. Update the API key in the Orchestrate MCP skill provider (Skills and apps → Sigma Refund MCP → Edit → update key → Save).

---

## 6.11 Summary of All Deployed Resources

| Resource | Type | URL / Name |
|---|---|---|
| `mcp-app-code-engine-mcp-server` | Code Engine Application | `https://mcp-app-code-engine-mcp-server.<id>.codeengine.appdomain.cloud` |
| `mcp-app-code-engine-chatbot` | Code Engine Application | `https://mcp-app-code-engine-chatbot.<id>.codeengine.appdomain.cloud` |
| `mcp-app-code-engine-icr` | Code Engine Registry Secret | ICR pull credentials |
| `mcp-app-code-engine-mcp-secrets` | Code Engine Secret | `MCP_API_KEY` |
| `mcp-app-code-engine-chatbot-secrets` | Code Engine Secret | `JWT_SECRET`, `MCP_API_KEY` |
| `mcp-app-code-engine-chatbot-config` | Code Engine ConfigMap | `MCP_SERVER_URL` |
| `Sigma Refund MCP` | Orchestrate Skill Provider | Connected to `/mcp` endpoint |
| `Refund Agent` | Orchestrate AI Agent | Uses `process_refund`, `get_refund_status` |

---

**You're done!** The complete flow is now live:

```
User → Orchestrate Refund Agent → MCP Skill Provider → mcp-app-code-engine-mcp-server (Code Engine)
User → mcp-app-code-engine Chatbot (Code Engine) → mcp-app-code-engine-mcp-server (Code Engine)
```
