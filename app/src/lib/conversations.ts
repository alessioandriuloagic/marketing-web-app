import { client } from "./rayfinClient";
import type { Conversation } from "../../rayfin/data/conversation";
import type { Message } from "../../rayfin/data/message";

export async function listConversations(userId: string): Promise<Conversation[]> {
  return client.data.Conversation.select([
    "id",
    "userId",
    "title",
    "createdAt",
    "updatedAt",
  ])
    .where({ userId: { eq: userId } })
    .orderBy({ updatedAt: "desc" })
    .execute();
}

export async function createConversation(
  userId: string,
  title: string,
): Promise<Conversation> {
  const now = new Date();
  return client.data.Conversation.create({
    userId,
    title,
    createdAt: now,
    updatedAt: now,
  });
}

export async function touchConversation(conversationId: string): Promise<void> {
  await client.data.Conversation.update(
    { id: conversationId },
    { updatedAt: new Date() },
  );
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return client.data.Message.select([
    "id",
    "userId",
    "conversationId",
    "role",
    "content",
    "createdAt",
  ])
    .where({ conversationId: { eq: conversationId } })
    .orderBy({ createdAt: "asc" })
    .execute();
}

export async function createMessage(params: {
  userId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<Message> {
  return client.data.Message.create({
    userId: params.userId,
    conversationId: params.conversationId,
    role: params.role,
    content: params.content,
    createdAt: new Date(),
  });
}
