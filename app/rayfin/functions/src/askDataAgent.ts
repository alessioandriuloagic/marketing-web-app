import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { askDataAgent } from "./dataAgentClient.js";
import type { AskDataAgentInput, AskDataAgentOutput, ChatHistoryEntry } from "./types.js";

function buildPrompt(question: string, history: ChatHistoryEntry[]): string {
  if (history.length === 0) {
    return question;
  }
  const lines = ["Contesto della conversazione precedente:"];
  for (const entry of history) {
    const speaker = entry.role === "user" ? "Utente" : "Assistente";
    lines.push(`${speaker}: ${entry.content}`);
  }
  lines.push("");
  lines.push(`Nuova domanda dell'utente: ${question}`);
  return lines.join("\n");
}

export async function askDataAgentHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  let input: AskDataAgentInput;
  try {
    input = (await request.json()) as AskDataAgentInput;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body." } };
  }

  if (!input?.question) {
    return { status: 400, jsonBody: { error: "'question' is required." } };
  }

  const prompt = buildPrompt(input.question, input.history ?? []);

  try {
    const answer = await askDataAgent(prompt);
    if (!answer) {
      return { status: 502, jsonBody: { error: "Data Agent returned an empty answer." } };
    }
    const output: AskDataAgentOutput = { answer };
    return { jsonBody: output };
  } catch (error) {
    context.error("askDataAgent failed", error);
    return { status: 502, jsonBody: { error: "Data Agent call failed." } };
  }
}

// authLevel 'anonymous': Rayfin's Fabric InvokeController is expected to be
// the actual auth boundary in front of this function (same pattern as the
// generated GraphQL API being gated by `services.auth`), analogous to how
// `client.data.*` calls need no auth code in the entity definitions. This
// is inferred from the documented client-side routing
// (`${baseUrl}/functions/<name>/invoke` through the Fabric InvokeController)
// and is unverified against a real deployment — check this first if the
// function is reachable without a valid session in production.
app.http("askDataAgent", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: askDataAgentHandler,
});
