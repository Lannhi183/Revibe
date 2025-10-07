import { Schema, model, baseOpts } from './_helpers.js';
const UserSchema = new Schema({
email: { type: String, required: true, unique: true, index: true },
email_verified: { type: Boolean, default: false },
password_hash: String,
role: { type: String, enum: ['user','admin','moderator'], default: 'user' },
name: String,
avatar_url: String,
phone: String,
is_deleted: { type: Boolean, default: false }
}, baseOpts);
export const User = model('User', UserSchema);