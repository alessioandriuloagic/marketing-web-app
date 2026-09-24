/**
 * MCP client for the Fabric Data Agent.
 *
 * A published Fabric data agent is exposed as an MCP server over Streamable HTTP at
 * `https://api.fabric.microsoft.com/v1/mcp/workspaces/{workspaceId}/dataagents/{dataAgentId}/agent`
 * and publishes exactly one tool: a natural-language "ask" tool. The agent performs all
 * reasoning server-side, so no external LLM is needed here — we only relay the question.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface DataAgentCoordinates {
  workspaceId: string;
  dataAgentId: string;
}

export interface DataAgentReply {
  answer: string;
  toolName: string;
}

export function buildMcpUrl({ workspaceId, dataAgentId }: DataAgentCoordinates): URL {
  return new URL(
    `https://api.fabric.microsoft.com/v1/mcp/workspaces/${workspaceId}/dataagents/${dataAgentId}/agent`
  );
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
    .map((turn) => `${turn.role === 'assistant' ? 'Assistant' : 'User'}: ${turn.content}`)
    .join('\n');
  return `Here is the earlier conversation, for context only:\n${transcript}\n\nAnswer this new question: ${question}`;
}

function extractText(content: unknown): string {
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

export async function askDataAgentOverMcp(
  coordinates: DataAgentCoordinates,
  fabricToken: string,
  prompt: string
): Promise<DataAgentReply> {
  const transport = new StreamableHTTPClientTransport(buildMcpUrl(coordinates), {
    requestInit: { headers: { Authorization: `Bearer ${fabricToken}` } },
  });
  const client = new Client({ name: 'marketing-data-chat', version: '1.0.0' });

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const tool = tools[0];
    if (!tool) {
      throw new Error(
        'The data agent MCP server exposed no tools. Confirm the data agent is published.'
      );
    }

    const properties = (tool.inputSchema as { properties?: Record<string, unknown> }).properties;
    const questionArg = properties ? Object.keys(properties)[0] : undefined;
    if (!questionArg) {
      throw new Error(`The data agent tool "${tool.name}" declared no input arguments.`);
    }

    const result = await client.callTool({
      name: tool.name,
      arguments: { [questionArg]: prompt },
    });

    if ((result as { isError?: boolean }).isError) {
      throw new Error(
        extractText((result as { content?: unknown }).content) || 'The data agent returned an error.'
      );
    }

    const answer = extractText((result as { content?: unknown }).content);
    return {
      answer: answer || 'The data agent returned an empty answer.',
      toolName: tool.name,
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}
