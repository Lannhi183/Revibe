import { Schema, model, baseOpts } from './_helpers.js';
const UserBadgeSchema = new Schema({ user_id:{ type:Schema.Types.ObjectId, ref:'User', index:true }, badge_code:{ type:String, index:true }, granted_by:{ type:Schema.Types.ObjectId, ref:'User' }, at:Date, revoked:{ type:Boolean, default:false } }, baseOpts);
UserBadgeSchema.index({ user_id:1, badge_code:1 }, { unique:true });
export const UserBadge = model('UserBadge', UserBadgeSchema);