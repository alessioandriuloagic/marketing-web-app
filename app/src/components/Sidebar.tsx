import type { Conversation } from "../../rayfin/data/conversation";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
  userEmail: string | null;
  onSignOut: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  userEmail,
  onSignOut,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Marketing Agente</span>
        <button className="new-chat-button" onClick={onNewChat} type="button">
          + Nuova chat
        </button>
      </div>

      <nav className="conversation-list">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            className={
              conversation.id === activeConversationId
                ? "conversation-item conversation-item-active"
                : "conversation-item"
            }
            onClick={() => onSelect(conversation.id)}
          >
            {conversation.title || "Nuova conversazione"}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-user">{userEmail}</span>
        <button className="sign-out-button" onClick={onSignOut} type="button">
          Esci
        </button>
      </div>
    </aside>
  );
}
