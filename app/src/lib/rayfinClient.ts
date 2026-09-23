import { RayfinClient } from "@microsoft/rayfin-client";
import type { Conversation } from "../../rayfin/data/conversation";
import type { Message } from "../../rayfin/data/message";
import type { AppFunctionsSchema } from "./functionsSchema";

export type Schema = {
  Conversation: Conversation;
  Message: Message;
};

export const client = new RayfinClient<Schema, AppFunctionsSchema>({
  baseUrl: import.meta.env.VITE_RAYFIN_API_URL ?? "http://localhost:5168",
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY ?? "",
});
