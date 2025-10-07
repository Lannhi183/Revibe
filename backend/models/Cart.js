import { Schema, model, baseOpts } from './_helpers.js';
const CartItem = new Schema({
listing_id: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
seller_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
title: String, image: String, qty: { type: Number, default: 1, min: 1 }, price: { type: Number, required: true }
}, { _id:false });
const CartSchema = new Schema({
buyer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
items: { type: [CartItem], default: [] }
}, baseOpts);
export const Cart = model('Cart', CartSchema);