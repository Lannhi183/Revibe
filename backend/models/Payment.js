import { Schema, model, baseOpts } from './_helpers.js';
const PaymentSchema = new Schema({
order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
method: { type: String, enum: ['online','cod'], required: true },
provider: { type: String },
amount: { type: Number, required: true },
currency: { type: String, enum: ['VND'], default: 'VND' },
status: { type: String, enum: ['pending','paid','failed','canceled'], default: 'pending', index: true },
provider_payload: { type: Schema.Types.Mixed }
}, baseOpts);
export const Payment = model('Payment', PaymentSchema);