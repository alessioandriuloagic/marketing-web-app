import { useEffect, useRef, useState } from 'react';

import { ChatSidebar } from '@/components/ChatSidebar';
import { Composer } from '@/components/Composer';
import { MessageBubble, ThinkingBubble } from '@/components/MessageBubble';
import { useAuth } from '@/hooks/AuthContext';
import { useChat } from '@/hooks/useChat';

const SUGGESTIONS = [
  'Which campaigns produced the most leads last quarter?',
  'Show the top 10 customers by revenue.',
  'How did conversion rates change month over month?',
  'Break down marketing spend by channel.',
];

export function ChatPage() {
  const { signOut, user } = useAuth();
  const chat = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.sending]);

  const activeConversation = chat.conversations.find((c) => c.id === chat.activeId);
  const isEmpty = chat.messages.length === 0 && !chat.loadingMessages;

  return (
    <div className="flex h-screen bg-white">
      <ChatSidebar
        conversations={chat.conversations}
        activeId={chat.activeId}
        loading={chat.loadingConversations}
        open={sidebarOpen}
        userLabel={user?.email}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => {
          chat.startNewChat();
          setSidebarOpen(false);
        }}
        onSelect={(id) => {
          chat.selectConversation(id);
          setSidebarOpen(false);
        }}
        onDelete={(id) => void chat.removeConversation(id)}
        onSignOut={() => void signOut()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
            aria-label="Open chat history"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="truncate text-sm font-semibold text-gray-900">
            {activeConversation?.title ?? 'Marketing data chat'}
          </h1>
        </header>

        {chat.error && (
          <div
            role="alert"
            className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span className="flex-1">{chat.error}</span>
            <button
              onClick={chat.dismissError}
              className="shrink-0 font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {chat.loadingMessages ? (
            <p className="py-16 text-center text-sm text-gray-400">Loading conversation…</p>
          ) : isEmpty ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 py-10">
              <h2 className="text-2xl font-semibold text-gray-900">
                Chat with your data
              </h2>
              <p className="mt-2 text-center text-sm text-gray-500">
                Ask a question in plain language. Your Fabric data agent answers using
                the data you already have access to.
              </p>
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => void chat.send(suggestion)}
                    disabled={chat.sending}
                    className="rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
              {chat.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {chat.sending && <ThinkingBubble />}
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        <Composer disabled={chat.sending} onSend={(q) => void chat.send(q)} />
      </div>
    </div>
  );
}
