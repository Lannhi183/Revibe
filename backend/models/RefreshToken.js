import { Schema, model, baseOpts } from './_helpers.js';
const RefreshTokenSchema = new Schema({
user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
token: { type: String, required: true, unique: true },
ip: String,
ua: String,
expires_at: { type: Date, required: true },
revoked_at: { type: Date }
}, baseOpts);
RefreshTokenSchema.index({ user_id: 1, token: 1 });
export const RefreshToken = model('RefreshToken', RefreshTokenSchema);