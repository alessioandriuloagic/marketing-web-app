import type { FunctionsSchema } from "@microsoft/rayfin-functions";

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

// Keep in sync with app/src/lib/functionsSchema.ts (frontend copy, so Vite
// never needs to resolve this backend-only project's node_modules).
//
// Note: the Microsoft Learn docs for FunctionsSchema show
// `export type X = {...} satisfies FunctionsSchema` — that doesn't compile
// (`satisfies` is an expression operator, not valid on a `type` alias's
// right-hand side; verified against the installed compiler). `interface
// ... extends FunctionsSchema` gives the same compile-time shape check.
export interface AppFunctionsSchema extends FunctionsSchema {
  askDataAgent: { input: AskDataAgentInput; output: AskDataAgentOutput };
}
