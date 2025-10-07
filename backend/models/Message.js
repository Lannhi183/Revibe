import { Schema, model, baseOpts } from './_helpers.js';
const MessageSchema = new Schema({
conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true, required: true },
sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
text: String,
attachments: [String]
}, baseOpts);
MessageSchema.index({ conversation_id: 1, created_at: 1 });
export const Message = model('Message', MessageSchema);