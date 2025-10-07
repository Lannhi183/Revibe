import { Schema, model, baseOpts } from './_helpers.js';
const AddressSchema = new Schema({
user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
label: String,
full_name: String,
phone: String,
line1: String, line2: String, ward: String, district: String, city: String, country: { type: String, default: 'VN' },
is_default: { type: Boolean, default: false }
}, baseOpts);
AddressSchema.index({ user_id: 1, is_default: 1 });
export const Address = model('Address', AddressSchema);