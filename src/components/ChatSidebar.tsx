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
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col bg-gray-900 text-gray-100 transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Chat history">
          <h2 className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            History
          </h2>

          {loading ? (
            <p className="px-2 text-sm text-gray-500">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 text-sm text-gray-500">No conversations yet.</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeId;
                return (
                  <li key={conversation.id} className="group relative">
                    <button
                      onClick={() => onSelect(conversation.id)}
                      className={`w-full truncate rounded-lg py-2 pl-3 pr-9 text-left text-sm transition-colors ${
                        isActive ? 'bg-white/15' : 'hover:bg-white/10'
                      }`}
                      title={conversation.title}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {conversation.title}
                    </button>
                    <button
                      onClick={() => onDelete(conversation.id)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 opacity-0 transition-colors hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Delete conversation ${conversation.title}`}
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          {userLabel && (
            <p className="truncate px-2 pb-2 text-xs text-gray-400" title={userLabel}>
              {userLabel}
            </p>
          )}
          <button
            onClick={onSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
