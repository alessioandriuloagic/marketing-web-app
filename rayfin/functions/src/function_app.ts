import {
  UserDataFunctions,
  AudienceType,
  type RayfinContext,
} from '@microsoft/fabric-user-data-functions';

import { askDataAgentOverMcp, composePrompt } from './dataAgentMcp.js';

const udf = new UserDataFunctions();

/** Fabric coordinates of the published data agent (workspace: fabric-ip-agic-prod-engine-crm). */
const DEFAULT_WORKSPACE_ID = 'c3c64719-18fb-4598-891c-3cdc94f79d2d';
const DEFAULT_DATA_AGENT_ID = 'bc867c23-3e1a-4069-9c3f-66f45ee4a2ef';

/** Number of prior turns replayed to the stateless MCP tool as conversation context. */
const CONTEXT_TURNS = 6;

interface HistoryTurn {
  role: string;
  content: string;
}

function parseHistory(historyJson: string): HistoryTurn[] {
  if (!historyJson) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(historyJson);
  } catch {
    throw new Error('history must be a JSON array of { role, content } objects.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('history must be a JSON array of { role, content } objects.');
  }
  return parsed
    .filter(
      (turn): turn is HistoryTurn =>
        typeof turn === 'object' &&
        turn !== null &&
        typeof (turn as HistoryTurn).role === 'string' &&
        typeof (turn as HistoryTurn).content === 'string'
    )
    .slice(-CONTEXT_TURNS);
}

/**
 * Relays a natural-language question to the Fabric data agent's MCP server.
 *
 * The Fabric token is an on-behalf-of token for the signed-in user, so the agent only
 * ever sees data that user is allowed to see.
 *
 * @param question    The user's question in natural language.
 * @param historyJson JSON array of prior `{ role, content }` turns, or an empty string.
 */
udf.func(
  'askDataAgent',
  async (
    question: string,
    historyJson: string,
    ctx: RayfinContext
  ): Promise<{ answer: string; toolName: string }> => {
    const trimmed = question?.trim();
    if (!trimmed) {
      throw new Error('question must not be empty.');
    }

    const coordinates = {
      workspaceId: ctx.getSecret('FABRIC_WORKSPACE_ID') ?? DEFAULT_WORKSPACE_ID,
      dataAgentId: ctx.getSecret('FABRIC_DATA_AGENT_ID') ?? DEFAULT_DATA_AGENT_ID,
    };

    const token = ctx.getToken(AudienceType.Fabric);
    const prompt = composePrompt(trimmed, parseHistory(historyJson));

    console.log(
      `askDataAgent: querying data agent ${coordinates.dataAgentId} (prompt ${prompt.length} chars)`
    );

    const reply = await askDataAgentOverMcp(coordinates, token, prompt);
    console.log(`askDataAgent: tool "${reply.toolName}" answered ${reply.answer.length} chars`);
    return reply;
  },
  [udf.connection({ audienceType: AudienceType.Fabric })]
);
