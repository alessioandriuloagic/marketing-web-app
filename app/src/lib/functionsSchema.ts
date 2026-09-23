import type { FunctionsSchema } from "@microsoft/rayfin-functions";

// Frontend-side copy of app/rayfin/functions/src/types.ts's AppFunctionsSchema.
// Kept as a plain duplicate (not a cross-package import) so Vite never needs
// to resolve rayfin/functions/'s own node_modules — that folder is a
// separate Azure Functions project with server-only dependencies
// (@azure/identity, @modelcontextprotocol/sdk) that have no business in the
// browser bundle. Keep the two in sync by hand.
export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface AskDataAgentInput {
  question: string;
  history: ChatHistoryEntry[];
}

export interface AskDataAgentOutput {
  answer: string;
}

export interface AppFunctionsSchema extends FunctionsSchema {
  askDataAgent: { input: AskDataAgentInput; output: AskDataAgentOutput };
}
