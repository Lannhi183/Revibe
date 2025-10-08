import { Schema, model, baseOpts } from './_helpers.js';
const UserSchema = new Schema({
email: { type: String, required: true, unique: true, index: true },
email_verified: { type: Boolean, default: false },
password_hash: String,
role: { type: String, enum: ['user','admin','moderator'], default: 'user' },
name: String,
avatar_url: String,
phone: String,
is_deleted: { type: Boolean, default: false },

// Admin management fields
is_banned: { type: Boolean, default: false },
banned_reason: String,
banned_at: Date,
banned_by: { type: Schema.Types.ObjectId, ref: 'User' },

// User badges/awards
badges: [{ type: String, enum: ['verified', 'top_seller', 'premium'] }],

// Activity tracking
listings_count: { type: Number, default: 0 },
orders_count: { type: Number, default: 0 },

join_date: { type: Date, default: Date.now },
last_active: { type: Date, default: Date.now }
}, baseOpts);

export const User = model('User', UserSchema);
