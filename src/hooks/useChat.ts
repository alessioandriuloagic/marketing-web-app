import { useCallback, useEffect, useRef, useState } from 'react';

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
  type ChatMessage,
  type Conversation,
} from '@/services/chat';

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong while contacting the data agent.';
}

export interface UseChat {
  conversations: Conversation[];
  activeId: string | null;
  messages: ChatMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  sending: boolean;
  error: string | null;
  dismissError: () => void;
  startNewChat: () => void;
  selectConversation: (id: string) => void;
  removeConversation: (id: string) => Promise<void>;
  send: (question: string) => Promise<void>;
}

export function useChat(): UseChat {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow message fetch overwriting a newer conversation's messages.
  const requestedIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listConversations()
      .then((items) => {
        if (cancelled) return;
        setConversations(items);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    requestedIdRef.current = activeId;
    setLoadingMessages(true);
    listMessages(activeId)
      .then((items) => {
        if (requestedIdRef.current !== activeId) return;
        setMessages(items);
      })
      .catch((err) => {
        if (requestedIdRef.current === activeId) setError(errorMessage(err));
      })
      .finally(() => {
        if (requestedIdRef.current === activeId) setLoadingMessages(false);
      });
  }, [activeId]);

  const startNewChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setError(null);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    setError(null);
  }, []);

  const removeConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        setActiveId((current) => (current === id ? null : current));
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    []
  );

  const send = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || sending) return;

      setError(null);
      setSending(true);

      // Snapshot before the optimistic append so the agent gets prior turns only.
      const priorTurns = messages;
      const optimistic: ChatMessage = {
        id: `pending-${crypto.randomUUID()}`,
        conversationId: activeId ?? 'pending',
        role: 'user',
        content: question,
        seq: priorTurns.length,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        let conversationId = activeId;
        if (!conversationId) {
          const conversation = await createConversation(deriveTitle(question));
          conversationId = conversation.id;
          setConversations((prev) => [conversation, ...prev]);
          setActiveId(conversation.id);
          requestedIdRef.current = conversation.id;
        }

        const userMessage = await appendMessage({
          conversationId,
          role: 'user',
          content: question,
          seq: priorTurns.length,
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? userMessage : m))
        );

        const reply = await askDataAgent(question, priorTurns);

        const assistantMessage = await appendMessage({
          conversationId,
          role: 'assistant',
          content: reply.answer,
          details: JSON.stringify({ toolName: reply.toolName }),
          seq: priorTurns.length + 1,
        });
        setMessages((prev) => [...prev, assistantMessage]);

        if (priorTurns.length === 0) {
          const title = deriveTitle(question);
          await renameConversation(conversationId, title).catch(() => undefined);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId && c.title === NEW_CHAT_TITLE
                ? { ...c, title }
                : c
            )
          );
        }
      } catch (err) {
        setError(errorMessage(err));
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } finally {
        setSending(false);
      }
    },
    [activeId, messages, sending]
  );

  return {
    conversations,
    activeId,
    messages,
    loadingConversations,
    loadingMessages,
    sending,
    error,
    dismissError: () => setError(null),
    startNewChat,
    selectConversation,
    removeConversation,
    send,
  };
}
