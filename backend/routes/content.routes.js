import { Router } from 'express';
import { ContentPage } from '../models/ContentPage.js';
import { ok } from '../utils/response.js';


const r = Router();
r.get('/:slug', async (req,res)=>{ const doc = await ContentPage.findOne({ slug:req.params.slug, published:true }).sort('-version'); ok(res, doc); });
export default r;