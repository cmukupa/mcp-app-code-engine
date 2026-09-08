/**
 * index.ts — Express server for the JWT-secured chatbot app
 *
 * Endpoints:
 *   GET  /            → Chat UI (HTML)
 *   GET  /health      → Liveness probe
 *   POST /auth/login  → Issue JWT
 *   POST /chat        → Handle chat message (requires Bearer JWT)
 */

import express, { Request, Response, NextFunction } from "express";
import { issueToken, verifyToken, type TokenPayload } from "./auth.js";
import { processRefund, parseRefundIntent } from "./refund.js";

const PORT = parseInt(process.env.PORT ?? "8080", 10);
const HOST = "127.0.0.1";

const app = express();
app.use(express.json());

// ── Health probe ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "sigma-chatbot", version: "1.0.0" });
});

// ── Auth: issue JWT ───────────────────────────────────────────────────────────

app.post("/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const token = issueToken(username, password);
  if (!token) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json({ token });
});

// ── JWT middleware ────────────────────────────────────────────────────────────

// Extend Request to carry the decoded token payload
declare module "express-serve-static-core" {
  interface Request {
    user?: TokenPayload;
  }
}

function requireJWT(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization: Bearer <token> header required" });
    return;
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Chat endpoint ─────────────────────────────────────────────────────────────

app.post("/chat", requireJWT, async (req: Request, res: Response) => {
  const { message } = req.body ?? {};
  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message field is required" });
    return;
  }

  const lower = message.toLowerCase();

  // Check for refund intent
  if (lower.includes("refund") || lower.includes("return") || lower.includes("cancel")) {
    const intent = parseRefundIntent(message);

    if (!intent) {
      res.json({
        reply:
          "I can help you with a refund! Please provide your order ID (e.g. ORD-12345), " +
          "the amount (e.g. $29.99), and a brief reason. " +
          "Example: 'I want a refund for order ORD-12345 of $29.99 because the item was damaged'",
      });
      return;
    }

    try {
      const result = await processRefund(intent.orderId, intent.amount, intent.reason);
      if (result.success) {
        res.json({
          reply:
            `I've submitted a refund request for order ${result.order_id}. ` +
            `Your refund ID is **${result.refund_id}** and the current status is **${result.status}**. ` +
            `You'll be notified once it's reviewed.`,
        });
      } else {
        res.json({
          reply: `I wasn't able to process your refund: ${result.error ?? "unknown error"}. Please try again or contact support.`,
        });
      }
    } catch (err) {
      console.error("[/chat] refund error:", err);
      res.status(500).json({ error: "An error occurred processing your refund. Please try again." });
    }
    return;
  }

  // Check for refund status inquiry
  if (lower.includes("status") && lower.match(/rf-[a-f0-9]+/i)) {
    res.json({
      reply:
        "To check a refund status, please use the /refund-status endpoint with your refund ID, " +
        "or ask: 'What is the status of refund RF-XXXX?'",
    });
    return;
  }

  // Generic responses
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    res.json({
      reply: `Hello, ${req.user?.username ?? "there"}! I'm your support assistant. I can help you request a refund or answer questions about your orders. How can I assist you today?`,
    });
    return;
  }

  res.json({
    reply:
      "I'm here to help! I can assist you with:\n" +
      "• **Refund requests** — just tell me your order ID, amount, and reason\n" +
      "• **Refund status** — provide your refund ID (e.g. RF-XXXX)\n\n" +
      "What would you like help with?",
  });
});

// ── Chat UI ───────────────────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sigma Support Chatbot</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
           background: #f0f2f5; display: flex; justify-content: center;
           align-items: center; min-height: 100vh; }
    .container { width: 420px; background: #fff; border-radius: 12px;
                 box-shadow: 0 4px 24px rgba(0,0,0,.12); overflow: hidden; }
    .header { background: #0f62fe; color: #fff; padding: 16px 20px;
              font-size: 16px; font-weight: 600; }
    #chat-box { height: 360px; overflow-y: auto; padding: 16px;
                display: flex; flex-direction: column; gap: 10px; }
    .msg { max-width: 80%; padding: 10px 14px; border-radius: 12px;
           font-size: 14px; line-height: 1.5; }
    .msg.user { background: #0f62fe; color: #fff; align-self: flex-end;
                border-bottom-right-radius: 4px; }
    .msg.bot  { background: #f4f4f4; color: #161616; align-self: flex-start;
                border-bottom-left-radius: 4px; }
    .input-row { display: flex; border-top: 1px solid #e0e0e0; }
    #msg-input { flex: 1; border: none; padding: 14px 16px; font-size: 14px;
                 outline: none; }
    #send-btn { background: #0f62fe; color: #fff; border: none;
                padding: 14px 20px; cursor: pointer; font-size: 14px; }
    #send-btn:hover { background: #0353e9; }
    #login-form { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
    #login-form h2 { font-size: 18px; color: #161616; }
    #login-form input { border: 1px solid #c6c6c6; border-radius: 4px;
                        padding: 10px 12px; font-size: 14px; }
    #login-form button { background: #0f62fe; color: #fff; border: none;
                         border-radius: 4px; padding: 12px; font-size: 14px;
                         cursor: pointer; }
    #login-form button:hover { background: #0353e9; }
    #login-err { color: #da1e28; font-size: 13px; display: none; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">Sigma Support Assistant</div>

  <!-- Login form -->
  <div id="login-form">
    <h2>Sign in to continue</h2>
    <input id="username" type="text" placeholder="Username" />
    <input id="password" type="password" placeholder="Password" />
    <div id="login-err">Invalid credentials. Try demo / demo123</div>
    <button id="login-btn">Sign in</button>
  </div>

  <!-- Chat UI (hidden until logged in) -->
  <div id="chat-ui" class="hidden">
    <div id="chat-box"></div>
    <div class="input-row">
      <input id="msg-input" type="text" placeholder="Type a message…" />
      <button id="send-btn">Send</button>
    </div>
  </div>
</div>

<script>
  let authToken = null;

  function addMsg(text, role) {
    const box = document.getElementById('chat-box');
    const el = document.createElement('div');
    el.className = 'msg ' + role;
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errEl = document.getElementById('login-err');
    errEl.style.display = 'none';

    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.style.display = 'block'; return; }

    authToken = data.token;
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('chat-ui').classList.remove('hidden');
    addMsg('Hi ' + username + '! I can help with refunds or order questions. How can I assist?', 'bot');
  });

  async function sendMessage() {
    const input = document.getElementById('msg-input');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    addMsg(message, 'user');

    const res = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    addMsg(data.reply || data.error || 'Something went wrong.', 'bot');
  }

  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
  });
</script>
</body>
</html>`);
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, HOST, () => {
  console.error(`Chatbot app listening on ${HOST}:${PORT}`);
});
