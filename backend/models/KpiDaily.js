import { Schema, model } from './_helpers.js';
const KpiDailySchema = new Schema({ date:{ type:String, unique:true }, orders:Number, gmv:Number, new_users:Number, new_listings:Number, paid_orders:Number }, { versionKey:false });
export const KpiDaily = model('KpiDaily', KpiDailySchema);