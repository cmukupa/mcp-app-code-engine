/**
 * refund.ts — calls the MCP server to process a refund
 *
 * Sends a JSON-RPC `tools/call` request for the `process_refund` tool.
 */

const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
const MCP_API_KEY = process.env.MCP_API_KEY;

if (!MCP_SERVER_URL) {
  console.error("FATAL: MCP_SERVER_URL environment variable is required");
  process.exit(1);
}
if (!MCP_API_KEY) {
  console.error("FATAL: MCP_API_KEY environment variable is required");
  process.exit(1);
}

export interface RefundResult {
  success: boolean;
  refund_id?: string;
  order_id?: string;
  amount?: number;
  status?: string;
  message?: string;
  error?: string;
}

/**
 * Calls the MCP server's process_refund tool and returns the parsed result.
 */
export async function processRefund(
  orderId: string,
  amount: number,
  reason: string
): Promise<RefundResult> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "process_refund",
      arguments: {
        order_id: orderId,
        amount,
        reason,
      },
    },
  };

  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": MCP_API_KEY as string,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`MCP server returned HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    result?: { content?: Array<{ type: string; text: string }> };
    error?: { message: string };
  };

  if (json.error) throw new Error(json.error.message);

  const text = json.result?.content?.[0]?.text ?? "{}";
  return JSON.parse(text) as RefundResult;
}

/**
 * Parse a natural-language chat message for refund intent.
 * Returns null if no refund intent is detected.
 */
export function parseRefundIntent(message: string): {
  orderId: string;
  amount: number;
  reason: string;
} | null {
  // Simple pattern matching — replace with an LLM call in production
  const orderMatch = message.match(/\b(ORD-?[\w\d]+|\d{4,})\b/i);
  const amountMatch = message.match(/\$\s*([\d.]+)/);

  if (!orderMatch || !amountMatch) return null;

  const orderId = orderMatch[1].startsWith("ORD")
    ? orderMatch[1]
    : `ORD-${orderMatch[1]}`;
  const amount = parseFloat(amountMatch[1]);

  // Capture the user's stated reason (everything after "because" or "since")
  const reasonMatch = message.match(/(?:because|since|as)\s+(.+)/i);
  const reason = reasonMatch
    ? reasonMatch[1].trim()
    : message.trim();

  return { orderId, amount, reason };
}
