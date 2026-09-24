import { getRayfinClient, isLocalBackend } from './rayfinClient';
import { askDataAgentOverMcp, composePrompt } from './dataAgentMcp';
import { getFabricToken, isFabricAuthConfigured } from './fabricAuth';

/**
 * Coordinates of the published Fabric data agent (`DA_Marketing_For_App` in
 * `fabric-ip-agic-prod-engine-crm`). Overridable at build time so the app can be pointed at
 * a different agent without a code change.
 *
 * The agent may sit on a capacity in a different region than the app: the MCP endpoint is a
 * global Fabric API, and only *hosting* a Fabric App item is region-gated.
 *
 * The variable names avoid the `VITE_FABRIC_*` prefix on purpose: `rayfin up` regenerates
 * `.env.local` with `VITE_FABRIC_WORKSPACE_ID` set to the *app's own* workspace, and
 * `.env.local` takes precedence over `.env` — a clash there silently points the MCP call
 * at the wrong workspace.
 */
const DATA_AGENT = {
  workspaceId:
    import.meta.env.VITE_DATA_AGENT_WORKSPACE_ID ??
    'c3c64719-18fb-4598-891c-3cdc94f79d2d',
  dataAgentId:
    import.meta.env.VITE_DATA_AGENT_ID ??
    'bc867c23-3e1a-4069-9c3f-66f45ee4a2ef',
};

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  details?: string | null;
  seq: number;
  createdAt: Date;
}

/** MSSQL NVARCHAR cap declared on `Message.content` in rayfin/data/Message.ts. */
const MAX_CONTENT = 4000;
/** Prior turns sent to the stateless data agent as conversation context. */
const CONTEXT_TURNS = 6;

export const NEW_CHAT_TITLE = 'New chat';

function truncate(value: string, max = MAX_CONTENT): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/** Derives a sidebar title from the first thing the user asked. */
export function deriveTitle(question: string): string {
  const flat = question.replace(/\s+/g, ' ').trim();
  if (!flat) return NEW_CHAT_TITLE;
  return flat.length <= 60 ? flat : `${flat.slice(0, 59)}…`;
}

// ---------------------------------------------------------------------------
// Local-dev fallback: `rayfin dev` runs against a local backend with no Fabric
// data service, so keep the chat history in memory to stay fully functional.
// ---------------------------------------------------------------------------

let localConversations: Conversation[] = [];
let localMessages: ChatMessage[] = [];

function requireUserId(): string {
  const session = getRayfinClient().auth.getSession();
  if (!session.isAuthenticated || !session.user) {
    throw new Error('You are signed out. Sign in again to continue.');
  }
  return session.user.id;
}

/**
 * The signed-in user's UPN, passed to MSAL so the Fabric token can usually be minted
 * silently against the existing browser session instead of prompting.
 */
function currentUserHint(): string | undefined {
  try {
    return getRayfinClient().auth.getSession().user?.email;
  } catch {
    return undefined;
  }
}

export async function listConversations(): Promise<Conversation[]> {
  if (isLocalBackend()) {
    return [...localConversations].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  const client = getRayfinClient();
  const page = await client.data.Conversation.select([
    'id',
    'title',
    'createdAt',
    'updatedAt',
  ])
    .orderBy({ updatedAt: 'desc' })
    .first(100)
    .executePaginated();
  return page.items as Conversation[];
}

export async function createConversation(
  title = NEW_CHAT_TITLE
): Promise<Conversation> {
  const now = new Date();

  if (isLocalBackend()) {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
    };
    localConversations.push(conversation);
    return conversation;
  }

  const client = getRayfinClient();
  const created = await client.data.Conversation.create({
    title: truncate(title, 200),
    createdAt: now,
    updatedAt: now,
    user_id: requireUserId(),
  });
  return created as Conversation;
}

export async function renameConversation(
  id: string,
  title: string
): Promise<void> {
  const updatedAt = new Date();

  if (isLocalBackend()) {
    const conversation = localConversations.find((c) => c.id === id);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = updatedAt;
    }
    return;
  }

  await getRayfinClient().data.Conversation.update(
    { id },
    { title: truncate(title, 200), updatedAt }
  );
}

export async function deleteConversation(id: string): Promise<void> {
  if (isLocalBackend()) {
    localConversations = localConversations.filter((c) => c.id !== id);
    localMessages = localMessages.filter((m) => m.conversationId !== id);
    return;
  }

  const client = getRayfinClient();
  const messages = await listMessages(id);
  for (const message of messages) {
    await client.data.Message.delete({ id: message.id });
  }
  await client.data.Conversation.delete({ id });
}

export async function listMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  if (isLocalBackend()) {
    return localMessages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.seq - b.seq);
  }

  const client = getRayfinClient();
  const page = await client.data.Message.select([
    'id',
    'conversationId',
    'role',
    'content',
    'details',
    'seq',
    'createdAt',
  ])
    .where({ conversationId: { eq: conversationId } })
    .orderBy({ seq: 'asc' })
    .first(500)
    .executePaginated();
  return page.items as ChatMessage[];
}

export async function appendMessage(input: {
  conversationId: string;
  role: MessageRole;
  content: string;
  details?: string;
  seq: number;
}): Promise<ChatMessage> {
  const createdAt = new Date();
  const content = truncate(input.content);

  if (isLocalBackend()) {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      role: input.role,
      content,
      details: input.details ?? null,
      seq: input.seq,
      createdAt,
    };
    localMessages.push(message);
    return message;
  }

  const client = getRayfinClient();
  const created = await client.data.Message.create({
    conversationId: input.conversationId,
    role: input.role,
    content,
    details: input.details ? truncate(input.details) : undefined,
    seq: input.seq,
    createdAt,
    user_id: requireUserId(),
  });
  await client.data.Conversation.update(
    { id: input.conversationId },
    { updatedAt: createdAt }
  );
  return created as ChatMessage;
}

/**
 * Sends a question to the Fabric data agent's MCP server.
 *
 * The call is made **directly from the browser**: the agent's MCP endpoint is stateless,
 * returns permissive CORS headers for this app's origin, and accepts a delegated Entra
 * token. That keeps every query attributed to the signed-in user — each person sees only
 * the data they are entitled to — and avoids Rayfin Functions, which are not available on
 * this tenant/capacity (invoking one returns `WorkloadException/FeatureNotSupported`).
 */
export async function askDataAgent(
  question: string,
  history: ChatMessage[]
): Promise<{ answer: string; toolName: string }> {
  if (isLocalBackend() && !isFabricAuthConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      answer:
        `**Local development mode.** Entra sign-in is not configured, so this is a stub ` +
        `reply to:\n\n> ${question}\n\n` +
        'Set `VITE_ENTRA_CLIENT_ID` in `.env.local` to query your real data.',
      toolName: 'local-stub',
    };
  }

  const priorTurns = history
    .slice(-CONTEXT_TURNS)
    .map(({ role, content }) => ({ role, content }));

  const token = await getFabricToken(currentUserHint());
  return askDataAgentOverMcp(
    DATA_AGENT,
    token,
    composePrompt(question, priorTurns)
  );
}

