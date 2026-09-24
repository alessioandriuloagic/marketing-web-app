import { Conversation } from './Conversation.js';
import { Message } from './Message.js';

export type ChatAppSchema = {
  Conversation: Conversation;
  Message: Message;
};

export const schema = [Conversation, Message];
