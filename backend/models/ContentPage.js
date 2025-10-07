import { Schema, model, baseOpts } from './_helpers.js';
const ContentPageSchema = new Schema({ slug:{ type:String, index:true }, version:{ type:Number, default:1 }, title:String, content_md:String, published:{ type:Boolean, default:false }, published_at:Date }, baseOpts);
ContentPageSchema.index({ slug:1, version:-1 });
export const ContentPage = model('ContentPage', ContentPageSchema);