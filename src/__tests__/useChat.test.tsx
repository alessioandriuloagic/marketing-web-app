import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listMessages = vi.fn();

vi.mock('@/services/chat', () => {
  let seq = 0;
  return {
    NEW_CHAT_TITLE: 'Nuova chat',
    deriveTitle: (q: string) => q,
    listConversations: vi.fn().mockResolvedValue([]),
    listMessages: (...args: unknown[]) => listMessages(...args),
    createConversation: vi.fn().mockImplementation(async (title: string) => ({
      id: 'conv-1',
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    appendMessage: vi.fn().mockImplementation(async (input: Record<string, unknown>) => ({
      ...input,
      id: `msg-${seq++}`,
      createdAt: new Date(),
    })),
    askDataAgent: vi.fn().mockResolvedValue({ answer: 'Il CTR è 3%', toolName: 'agent' }),
    renameConversation: vi.fn().mockResolvedValue(undefined),
    deleteConversation: vi.fn(),
  };
});

import { useChat } from '@/hooks/useChat';

describe('useChat', () => {
  beforeEach(() => {
    listMessages.mockReset();
    listMessages.mockResolvedValue([]);
  });

  it('keeps question and answer visible when the first message creates the conversation', async () => {
    const { result } = renderHook(() => useChat());
    await waitFor(() => expect(result.current.loadingConversations).toBe(false));

    await act(async () => {
      await result.current.send('Qual è il CTR?');
    });

    expect(result.current.activeId).toBe('conv-1');
    expect(listMessages).not.toHaveBeenCalled();
    expect(result.current.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(result.current.messages[1].content).toBe('Il CTR è 3%');
  });
});
