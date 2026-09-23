import { client } from "./rayfinClient";
import type { ChatHistoryEntry } from "./functionsSchema";

export type { ChatHistoryEntry } from "./functionsSchema";

export async function askMarketingAgente(params: {
  question: string;
  history: ChatHistoryEntry[];
}): Promise<string> {
  // Routed through Rayfin's own Fabric InvokeController
  // (`${baseUrl}/functions/askDataAgent/invoke`), authenticated with the
  // signed-in user's Rayfin session automatically — no token handling here.
  const result = await client.functions.askDataAgent.invoke({
    question: params.question,
    history: params.history,
  });
  return result.answer;
}
