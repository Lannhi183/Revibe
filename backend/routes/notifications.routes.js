import { Router } from 'express';
import { Notification } from '../models/Notification.js';
import { ok } from '../utils/response.js';


const r = Router();


r.get('/:userId', async (req,res)=>{ ok(res, await Notification.find({ user_id:req.params.userId }).sort('-created_at').limit(100)); });
r.post('/:userId/read-all', async (req,res)=>{ await Notification.updateMany({ user_id:req.params.userId, read:false }, { $set:{ read:true } }); ok(res, { ok:true }); });


export default r;