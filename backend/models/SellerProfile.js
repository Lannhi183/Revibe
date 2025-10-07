import { Schema, model, baseOpts } from './_helpers.js';
const SellerProfileSchema = new Schema({
user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
shop_name: String,
bio: String,
location: String,
kyc_status: { type: String, enum: ['unverified','pending_review','verified','rejected'], default: 'unverified' },
badges: [String],
rating_avg: { type: Number, default: 0 },
rating_count: { type: Number, default: 0 },
followers: { type: Number, default: 0 }
}, baseOpts);
export const SellerProfile = model('SellerProfile', SellerProfileSchema);