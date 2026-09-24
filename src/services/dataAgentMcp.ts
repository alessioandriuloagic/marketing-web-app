/**
 * Browser-side MCP client for the Fabric Data Agent.
 *
 * A published Fabric data agent is exposed as an MCP server at
 * `https://api.fabric.microsoft.com/v1/mcp/workspaces/{workspaceId}/dataagents/{dataAgentId}/agent`
 * and publishes exactly one tool: a natural-language "ask" tool.
 *
 * The endpoint is **stateless**: it issues no `mcp-session-id`, answers with plain
 * `application/json` rather than an SSE stream, and accepts `tools/list` and `tools/call`
 * without a prior `initialize` handshake. It also returns permissive CORS headers for the
 * app's origin. Together that means the browser can speak JSON-RPC to it with `fetch`
 * alone, so we deliberately avoid the MCP SDK and its transport machinery here.
 */

export interface DataAgentCoordinates {
  workspaceId: string;
  dataAgentId: string;
}

export interface DataAgentReply {
  answer: string;
  toolName: string;
}

/** The data agent reasons server-side; a simple question took ~22s to answer. */
const REQUEST_TIMEOUT_MS = 240_000;

export function buildMcpUrl({
  workspaceId,
  dataAgentId,
}: DataAgentCoordinates): string {
  return `https://api.fabric.microsoft.com/v1/mcp/workspaces/${workspaceId}/dataagents/${dataAgentId}/agent`;
}

/**
 * Renders prior turns into the single question argument the agent accepts.
 * The MCP tool is stateless per call, so conversation context must be inlined.
 */
export function composePrompt(
  question: string,
  priorTurns: { role: string; content: string }[]
): string {
  if (priorTurns.length === 0) {
    return question;
  }
  const transcript = priorTurns
    .map(
      (turn) =>
        `${turn.role === 'assistant' ? 'Assistant' : 'User'}: ${turn.content}`
    )
    .join('\n');
  return `Here is the earlier conversation, for context only:\n${transcript}\n\nAnswer this new question: ${question}`;
}

export function extractText(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .filter(
      (block): block is { type: 'text'; text: string } =>
        typeof block === 'object' &&
        block !== null &&
        (block as { type?: unknown }).type === 'text' &&
        typeof (block as { text?: unknown }).text === 'string'
    )
    .map((block) => block.text)
    .join('\n')
    .trim();
}

interface JsonRpcResponse {
  result?: unknown;
  error?: { code?: number; message?: string };
}

let nextRequestId = 1;

async function rpc(
  url: string,
  fabricToken: string,
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fabricToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextRequestId++,
      method,
      params,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(
      `The data agent rejected the request (HTTP ${response.status}). ${raw.slice(0, 300)}`
    );
  }

  let payload: JsonRpcResponse;
  try {
    payload = JSON.parse(raw) as JsonRpcResponse;
  } catch {
    throw new Error(
      `The data agent returned a malformed response: ${raw.slice(0, 300)}`
    );
  }

  if (payload.error) {
    throw new Error(
      payload.error.message ?? `The data agent returned error ${payload.error.code}.`
    );
  }
  return payload.result;
}

interface McpTool {
  name: string;
  inputSchema?: { properties?: Record<string, unknown> };
}

/** The published tool never changes for a given agent, so resolve it once per session. */
const toolCache = new Map<string, McpTool>();

async function resolveTool(url: string, fabricToken: string): Promise<McpTool> {
  const cached = toolCache.get(url);
  if (cached) return cached;

  const result = (await rpc(url, fabricToken, 'tools/list', {})) as {
    tools?: McpTool[];
  };
  const tool = result.tools?.[0];
  if (!tool) {
    throw new Error(
      'The data agent MCP server exposed no tools. Confirm the data agent is published.'
    );
  }
  toolCache.set(url, tool);
  return tool;
}

export async function askDataAgentOverMcp(
  coordinates: DataAgentCoordinates,
  fabricToken: string,
  prompt: string
): Promise<DataAgentReply> {
  const url = buildMcpUrl(coordinates);
  const tool = await resolveTool(url, fabricToken);

  const questionArg = tool.inputSchema?.properties
    ? Object.keys(tool.inputSchema.properties)[0]
    : undefined;
  if (!questionArg) {
    throw new Error(`The data agent tool "${tool.name}" declared no input arguments.`);
  }

  const result = (await rpc(url, fabricToken, 'tools/call', {
    name: tool.name,
    arguments: { [questionArg]: prompt },
  })) as { content?: unknown; isError?: boolean };

  if (result.isError) {
    throw new Error(
      extractText(result.content) || 'The data agent returned an error.'
    );
  }

  return {
    answer: extractText(result.content) || 'The data agent returned an empty answer.',
    toolName: tool.name,
  };
}
