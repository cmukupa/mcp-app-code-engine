#!/usr/bin/env node
/**
 * sigma-mcp-server — Streamable HTTP MCP server for IBM Code Engine
 *
 * Transport : HTTP (POST /mcp)
 * Auth      : X-API-Key header validated against MCP_API_KEY env var
 * Tools     : process_refund, get_refund_status
 */

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import crypto from "crypto";

// ── Environment ──────────────────────────────────────────────────────────────

const MCP_API_KEY = process.env.MCP_API_KEY;
if (!MCP_API_KEY) {
  console.error("FATAL: MCP_API_KEY environment variable is required");
  process.exit(1);
}

const PORT = parseInt(process.env.PORT ?? "8080", 10);
// Bind to localhost inside the container; Code Engine routes HTTPS traffic here
const HOST = "127.0.0.1";

// ── In-memory refund store (replace with a real DB in production) ─────────────

interface RefundRecord {
  refund_id: string;
  order_id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const refunds = new Map<string, RefundRecord>();

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "sigma-mcp-server",
  version: "1.0.0",
});

// Tool: process_refund
server.registerTool(
  "process_refund",
  {
    description:
      "Initiates a refund request for a customer order. Returns a refund_id that can be used to track status.",
    inputSchema: z.object({
      order_id: z.string().describe("The order ID to refund"),
      amount: z
        .number()
        .positive()
        .describe("Refund amount in USD (must be > 0)"),
      reason: z
        .string()
        .min(10)
        .describe("Reason for the refund (minimum 10 characters)"),
    }),
  },
  async ({ order_id, amount, reason }) => {
    try {
      const refund_id = `RF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const record: RefundRecord = {
        refund_id,
        order_id,
        amount,
        reason,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      refunds.set(refund_id, record);

      console.error(
        `[process_refund] Created ${refund_id} for order ${order_id}, amount $${amount}`
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              refund_id,
              order_id,
              amount,
              status: "pending",
              message: `Refund request ${refund_id} has been submitted and is pending review.`,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to process refund: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: get_refund_status
server.registerTool(
  "get_refund_status",
  {
    description: "Returns the current status and details of an existing refund request.",
    inputSchema: z.object({
      refund_id: z.string().describe("The refund ID returned by process_refund"),
    }),
  },
  async ({ refund_id }) => {
    try {
      const record = refunds.get(refund_id);
      if (!record) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `No refund found with ID ${refund_id}`,
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              ...record,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve refund: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Express HTTP Server ───────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// API-key middleware
app.use("/mcp", (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (key !== MCP_API_KEY) {
    res.status(401).json({ error: "Invalid or missing X-API-Key header" });
    return;
  }
  next();
});

// Health probe (no auth required — used by Code Engine liveness checks)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "sigma-mcp-server", version: "1.0.0" });
});

// MCP endpoint
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — each request is independent
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(PORT, HOST, () => {
  console.error(`MCP server listening on ${HOST}:${PORT}`);
});
