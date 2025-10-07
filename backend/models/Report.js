import { Schema, model, baseOpts } from './_helpers.js';
const Decision = new Schema({ by: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, action: String, note: String }, { _id:false });
const ReportSchema = new Schema({
target_type: { type: String, enum: ['product','user','chat','order'], required: true },
target_id: { type: Schema.Types.ObjectId, required: true },
reporter_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
reason: String,
attachments: [String],
status: { type: String, enum: ['open','in_review','resolved','rejected'], default: 'open', index: true },
decisions: [Decision]
}, baseOpts);
ReportSchema.index({ target_type: 1, target_id: 1 });
export const Report = model('Report', ReportSchema);