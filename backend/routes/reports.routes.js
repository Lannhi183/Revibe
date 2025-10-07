import { Router } from 'express';
import { Report } from '../models/Report.js';
import { ok } from '../utils/response.js';


const r = Router();
r.post('/', async (req,res)=>{ ok(res, await Report.create(req.body)); });
r.get('/queue', async (req,res)=>{ ok(res, await Report.find({ status: { $in: ['open','in_review'] } }).sort('-created_at')); });
r.post('/:id/resolve', async (req,res)=>{ const { action, note, by } = req.body; const doc = await Report.findByIdAndUpdate(req.params.id, { status:'resolved', $push:{ decisions:{ by, at:new Date(), action, note } } }, { new:true }); ok(res, doc); });
export default r;