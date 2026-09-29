import { BrandMark } from '@/components/BrandMark';
import type { Conversation } from '@/services/chat';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  open: boolean;
  userLabel?: string;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  loading,
  open,
  userLabel,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
  onSignOut,
}: ChatSidebarProps) {
  const initials = (userLabel ?? '?')
    .split('@')[0]
    .split(/[.\-_\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <BrandMark size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">Marketing Data Chat</p>
            <p className="truncate text-xs text-slate-400">Powered by Microsoft Fabric</p>
          </div>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg hover:brightness-110"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            Nuova chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Cronologia chat">
          <h2 className="px-2 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Cronologia
          </h2>

          {loading ? (
            <ul className="space-y-2 px-1" aria-label="Caricamento">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </ul>
          ) : conversations.length === 0 ? (
            <p className="px-2 text-sm text-slate-400">Nessuna conversazione.</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeId;
                return (
                  <li key={conversation.id} className="group relative">
                    <button
                      onClick={() => onSelect(conversation.id)}
                      className={`flex w-full items-center gap-2 rounded-lg py-2 pl-2.5 pr-9 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-indigo-50 font-medium text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={conversation.title}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <svg
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="truncate">{conversation.title}</span>
                    </button>
                    <button
                      onClick={() => onDelete(conversation.id)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Elimina la conversazione ${conversation.title}`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-semibold text-white"
              aria-hidden="true"
            >
              {initials || '?'}
            </span>
            <p className="min-w-0 flex-1 truncate text-xs text-slate-500" title={userLabel}>
              {userLabel ?? 'Utente'}
            </p>
            <button
              onClick={onSignOut}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Esci"
              title="Esci"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
