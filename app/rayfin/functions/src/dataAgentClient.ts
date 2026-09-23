/**
 * Calls the Fabric Data Agent's MCP endpoint using a service-principal token.
 *
 * Mirrors the flow documented at
 * https://learn.microsoft.com/fabric/data-science/data-agent-mcp-server#connect-from-python
 * (there written for Python; this is the TypeScript equivalent), using
 * ClientSecretCredential (client-credentials flow) since this runs
 * unattended as a Fabric-hosted function, not an interactive session.
 */
import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

const FABRIC_SCOPE = "https://api.fabric.microsoft.com/.default";

let credential: ClientSecretCredential | undefined;

function getCredential(): ClientSecretCredential {
  if (!credential) {
    const tenantId = process.env.FABRIC_TENANT_ID;
    const clientId = process.env.FABRIC_CLIENT_ID;
    const clientSecret = process.env.FABRIC_CLIENT_SECRET;
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        "FABRIC_TENANT_ID, FABRIC_CLIENT_ID and FABRIC_CLIENT_SECRET must be set.",
      );
    }
    credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  }
  return credential;
}

function getMcpUrl(): string {
  const workspaceId = process.env.FABRIC_WORKSPACE_ID;
  const dataAgentId = process.env.FABRIC_DATA_AGENT_ID;
  if (!workspaceId || !dataAgentId) {
    throw new Error("FABRIC_WORKSPACE_ID and FABRIC_DATA_AGENT_ID must be set.");
  }
  return `https://api.fabric.microsoft.com/v1/mcp/workspaces/${workspaceId}/dataagents/${dataAgentId}/agent`;
}

export async function askDataAgent(prompt: string): Promise<string> {
  const token = await getCredential().getToken(FABRIC_SCOPE);
  if (!token) {
    throw new Error("Failed to acquire a Fabric access token.");
  }

  const transport = new StreamableHTTPClientTransport(new URL(getMcpUrl()), {
    requestInit: {
      headers: { Authorization: `Bearer ${token.token}` },
    },
  });

  const client = new Client({ name: "marketing-agente-function", version: "1.0.0" });

  try {
    await client.connect(transport);

    const toolsResult = await client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema,
    );
    const tool = toolsResult.tools[0];
    if (!tool) {
      throw new Error("The Data Agent MCP server exposed no tools.");
    }

    const properties = (
      tool.inputSchema as { properties?: Record<string, unknown> } | undefined
    )?.properties;
    const questionArg = properties ? Object.keys(properties)[0] : undefined;
    if (!questionArg) {
      throw new Error(`Tool '${tool.name}' has no arguments in its input schema.`);
    }

    const result = await client.request(
      {
        method: "tools/call",
        params: { name: tool.name, arguments: { [questionArg]: prompt } },
      },
      CallToolResultSchema,
    );

    const textParts = result.content
      .filter(
        (item): item is { type: "text"; text: string } => item.type === "text",
      )
      .map((item) => item.text);

    return textParts.join("\n").trim();
  } finally {
    await transport.close();
  }
}
