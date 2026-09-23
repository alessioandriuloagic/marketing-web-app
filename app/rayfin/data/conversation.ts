import { entity, uuid, text, date, role } from "@microsoft/rayfin-core";

@entity()
@role("authenticated", ["create", "read", "update", "delete"], {
  policy: (claims, item) => claims.sub.eq(item.userId),
})
export class Conversation {
  @uuid() id!: string;
  @text() userId!: string;
  @text() title!: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
