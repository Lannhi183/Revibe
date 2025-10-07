import { Schema, model, baseOpts } from './_helpers.js';
const ReviewSchema = new Schema({
order_id: { type: Schema.Types.ObjectId, ref: 'Order', index: true, required: true },
target_user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
author_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
rating: { type: Number, min: 1, max: 5, required: true },
comment: String
}, baseOpts);
export const Review = model('Review', ReviewSchema);