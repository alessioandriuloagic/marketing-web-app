import { entity, authenticated, uuid, text, int, date } from '@microsoft/rayfin-core';

@entity()
@authenticated('*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Message {
  @uuid() id!: string;
  @uuid() conversationId!: string;
  @text({ max: 20 }) role!: string;
  @text({ max: 4000 }) content!: string;
  /** Serialized JSON with the agent's reasoning steps and generated queries. */
  @text({ max: 4000, optional: true }) details?: string;
  @int() seq!: number;
  @date() createdAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
