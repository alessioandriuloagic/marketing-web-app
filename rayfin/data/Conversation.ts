import { entity, authenticated, uuid, text, date } from '@microsoft/rayfin-core';

@entity()
@authenticated('*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Conversation {
  @uuid() id!: string;
  @text({ min: 1, max: 200 }) title!: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
