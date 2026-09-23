import { ApiClient } from "@microsoft/rayfin-lib";
import { client } from "./rayfinClient";

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  answer: string;
}

const chatApiUrl = import.meta.env.VITE_CHAT_API_URL ?? "";

// A plain ApiClient pointed at the mcp-proxy backend (a different origin
// than the Rayfin app backend). `attachToClient` wires it up so every
// request automatically carries the signed-in user's Rayfin session token,
// refreshed on 401 — the app never reads or stores the raw token itself.
// Rayfin's `OpaqueSession` deliberately conceals it from app code; this is
// the SDK-sanctioned way to forward it to another trusted backend.
const proxyClient = new ApiClient({
  baseUrl: chatApiUrl,
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY ?? "",
});
client.auth.attachToClient(proxyClient);

export async function askMarketingAgente(params: {
  conversationId: string;
  question: string;
  history: ChatHistoryEntry[];
}): Promise<string> {
  if (!chatApiUrl) {
    throw new Error("VITE_CHAT_API_URL non configurato.");
  }

  const data = await proxyClient.post<ChatResponse>("/chat", {
    conversationId: params.conversationId,
    question: params.question,
    history: params.history,
  });

  return data.answer;
}
