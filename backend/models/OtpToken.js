import { Schema, model, baseOpts } from './_helpers.js';
const OtpTokenSchema = new Schema({
email: { type: String, index: true, required: true },
otp: { type: String, required: true },
purpose: { type: String, enum: ['login','verify_email','reset_password','change_password'], required: true },
attempts: { type: Number, default: 0 },
expires_at: { type: Date, required: true },
consumed_at: { type: Date }
}, baseOpts);
OtpTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 3600 });
export const OtpToken = model('OtpToken', OtpTokenSchema);