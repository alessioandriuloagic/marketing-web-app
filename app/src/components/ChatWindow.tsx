import { useEffect, useRef } from "react";
import type { Message } from "../../rayfin/data/message";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface ChatWindowProps {
  messages: Message[];
  onSend: (text: string) => void;
  isSending: boolean;
}

export function ChatWindow({ messages, onSend, isSending }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <section className="chat-window">
      <div className="message-list">
        {messages.length === 0 && (
          <div className="empty-state">
            Chiedi qualcosa a Marketing Agente sui tuoi dati.
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isSending && (
          <div className="message message-assistant">
            <div className="message-bubble message-typing">Sto pensando...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={onSend} disabled={isSending} />
    </section>
  );
}
