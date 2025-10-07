import { Schema, model, baseOpts } from './_helpers.js';
const NotificationSchema = new Schema({
user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
type: { type: String, enum: ['order_status','message','system','moderation'], required: true },
title: String,
payload: { type: Schema.Types.Mixed },
read: { type: Boolean, default: false, index: true }
}, baseOpts);
NotificationSchema.index({ user_id: 1, read: 1, created_at: -1 });
export const Notification = model('Notification', NotificationSchema);