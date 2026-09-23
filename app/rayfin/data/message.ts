import { entity, uuid, text, date, role } from "@microsoft/rayfin-core";

@entity()
@role("authenticated", ["create", "read", "update", "delete"], {
  policy: (claims, item) => claims.sub.eq(item.userId),
})
export class Message {
  @uuid() id!: string;
  @text() userId!: string;
  @text() conversationId!: string;
  @text() role!: "user" | "assistant";
  @text() content!: string;
  @date() createdAt!: Date;
}
