import { useCallback, useEffect, useState } from "react";
import type { Conversation } from "../rayfin/data/conversation";
import type { Message } from "../rayfin/data/message";
import { useFabricAuth } from "./lib/useFabricAuth";
import {
  createConversation,
  createMessage,
  listConversations,
  listMessages,
  touchConversation,
} from "./lib/conversations";
import { askMarketingAgente, type ChatHistoryEntry } from "./lib/chatApi";
import { Sidebar } from "./components/Sidebar";
import { ChatWindow } from "./components/ChatWindow";

const HISTORY_WINDOW = 10;

export default function App() {
  const { isAuthenticated, userId, userEmail, signIn, signOut } = useFabricAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return;
    }
    listConversations(userId)
      .then(setConversations)
      .catch((err) => setError(String(err)));
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    listMessages(activeConversationId)
      .then(setMessages)
      .catch((err) => setError(String(err)));
  }, [activeConversationId]);

  const handleNewChat = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const conversation = await createConversation(userId, "Nuova conversazione");
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
    } catch (err) {
      setError(String(err));
    }
  }, [userId]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!userId) {
        return;
      }

      let conversationId = activeConversationId;
      if (!conversationId) {
        const conversation = await createConversation(
          userId,
          text.slice(0, 60),
        );
        setConversations((prev) => [conversation, ...prev]);
        conversationId = conversation.id;
        setActiveConversationId(conversationId);
      }

      setError(null);
      setIsSending(true);
      try {
        // Snapshot prior turns before this message joins the thread, so the
        // proxy receives context distinct from the new question.
        const history: ChatHistoryEntry[] = messages
          .slice(-HISTORY_WINDOW)
          .map((message) => ({ role: message.role, content: message.content }));

        const userMessage = await createMessage({
          userId,
          conversationId,
          role: "user",
          content: text,
        });
        setMessages((prev) => [...prev, userMessage]);

        const answer = await askMarketingAgente({
          question: text,
          history,
        });

        const assistantMessage = await createMessage({
          userId,
          conversationId,
          role: "assistant",
          content: answer,
        });
        setMessages((prev) => [...prev, assistantMessage]);
        await touchConversation(conversationId);
      } catch (err) {
        setError(String(err));
      } finally {
        setIsSending(false);
      }
    },
    [userId, activeConversationId, messages],
  );

  if (!isAuthenticated) {
    return (
      <div className="sign-in-screen">
        <h1>Marketing Agente</h1>
        <p>Accedi con il tuo account Fabric per iniziare.</p>
        <button type="button" onClick={() => void signIn()}>
          Accedi con Fabric
        </button>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={setActiveConversationId}
        onNewChat={() => void handleNewChat()}
        userEmail={userEmail}
        onSignOut={() => void signOut()}
      />
      <main className="main-panel">
        {error && <div className="error-banner">{error}</div>}
        <ChatWindow
          messages={messages}
          onSend={(text) => void handleSend(text)}
          isSending={isSending}
        />
      </main>
    </div>
  );
}
