import type { Message } from "../../rayfin/data/message";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "message message-user" : "message message-assistant"}>
      <div className="message-bubble">{message.content}</div>
    </div>
  );
}
