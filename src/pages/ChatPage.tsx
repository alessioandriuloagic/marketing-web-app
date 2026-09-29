import { useEffect, useRef, useState } from 'react';

import { BrandMark } from '@/components/BrandMark';
import { ChatSidebar } from '@/components/ChatSidebar';
import { Composer } from '@/components/Composer';
import { MessageBubble, ThinkingBubble } from '@/components/MessageBubble';
import { SuggestionCards } from '@/components/SuggestionCards';
import { useAuth } from '@/hooks/AuthContext';
import { useChat } from '@/hooks/useChat';

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
  const rawName = user?.name?.split(/[\s.@_]/)[0];
  const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : undefined;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
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

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/50 via-sky-200/40 to-cyan-200/40 blur-3xl"
          aria-hidden="true"
        />

        <header className="relative z-10 flex items-center gap-3 border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Apri la cronologia delle chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="truncate text-sm font-semibold text-slate-800">
            {activeConversation?.title ?? 'Marketing Data Chat'}
          </h1>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Data Agent Fabric
          </span>
        </header>

        {chat.error && (
          <div
            role="alert"
            className="relative z-10 mx-4 mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="flex-1">{chat.error}</span>
            <button onClick={chat.dismissError} className="shrink-0 font-medium underline">
              Chiudi
            </button>
          </div>
        )}

        <main className="relative z-0 flex-1 overflow-y-auto">
          {chat.loadingMessages ? (
            <p className="py-16 text-center text-sm text-slate-400">Caricamento conversazione…</p>
          ) : isEmpty ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-4 py-10">
              <BrandMark size="lg" />
              <h2 className="mt-5 text-center text-3xl font-semibold tracking-tight text-slate-900">
                {firstName ? `Ciao ${firstName}, ` : ''}
                <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                  cosa vuoi scoprire?
                </span>
              </h2>
              <p className="mt-3 max-w-xl text-center text-sm text-slate-500">
                Fai una domanda in linguaggio naturale. Il Data Agent di Fabric risponde usando
                i dati a cui hai già accesso.
              </p>
              <p className="mb-3 mt-10 self-start text-xs font-semibold uppercase tracking-wider text-slate-400">
                Domande frequenti
              </p>
              <SuggestionCards disabled={chat.sending} onPick={(q) => void chat.send(q)} />
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
