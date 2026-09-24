import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/rayfinClient', () => ({
  isLocalBackend: () => true,
  getRayfinClient: vi.fn(),
}));

import {
  appendMessage,
  askDataAgent,
  createConversation,
  deleteConversation,
  deriveTitle,
  listConversations,
  listMessages,
  renameConversation,
  NEW_CHAT_TITLE,
} from '@/services/chat';

describe('chat service (in-memory mode)', () => {
  beforeEach(async () => {
    for (const conversation of await listConversations()) {
      await deleteConversation(conversation.id);
    }
  });

  it('creates, lists, renames, and deletes conversations', async () => {
    expect(await listConversations()).toEqual([]);

    const conversation = await createConversation();
    expect(conversation.title).toBe(NEW_CHAT_TITLE);
    expect(await listConversations()).toHaveLength(1);

    await renameConversation(conversation.id, 'Campaign performance');
    const [renamed] = await listConversations();
    expect(renamed?.title).toBe('Campaign performance');

    await deleteConversation(conversation.id);
    expect(await listConversations()).toEqual([]);
  });

  it('stores messages per conversation in sequence order', async () => {
    const first = await createConversation('first');
    const second = await createConversation('second');

    await appendMessage({
      conversationId: first.id,
      role: 'user',
      content: 'How many leads?',
      seq: 0,
    });
    await appendMessage({
      conversationId: first.id,
      role: 'assistant',
      content: '42 leads.',
      seq: 1,
    });
    await appendMessage({
      conversationId: second.id,
      role: 'user',
      content: 'Unrelated',
      seq: 0,
    });

    const messages = await listMessages(first.id);
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(messages.map((m) => m.seq)).toEqual([0, 1]);
    expect(await listMessages(second.id)).toHaveLength(1);
  });

  it('removes a conversation together with its messages', async () => {
    const conversation = await createConversation('doomed');
    await appendMessage({
      conversationId: conversation.id,
      role: 'user',
      content: 'hello',
      seq: 0,
    });

    await deleteConversation(conversation.id);

    expect(await listMessages(conversation.id)).toEqual([]);
  });

  it('returns a stub answer instead of calling Fabric in local mode', async () => {
    const reply = await askDataAgent('Top customers?', []);
    expect(reply.toolName).toBe('local-stub');
    expect(reply.answer).toContain('Top customers?');
  });
});

describe('deriveTitle', () => {
  it('collapses whitespace', () => {
    expect(deriveTitle('  show   me\nthe leads ')).toBe('show me the leads');
  });

  it('falls back to the default title when the question is blank', () => {
    expect(deriveTitle('   ')).toBe(NEW_CHAT_TITLE);
  });

  it('truncates long questions', () => {
    const title = deriveTitle('a'.repeat(120));
    expect(title).toHaveLength(60);
    expect(title.endsWith('…')).toBe(true);
  });
});
