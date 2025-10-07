import { Schema, model, baseOpts } from './_helpers.js';
const BadgeSchema = new Schema({ code: { type:String, unique:true }, name:String, icon:String, desc:String, active:{ type:Boolean, default:true } }, baseOpts);
export const Badge = model('Badge', BadgeSchema);