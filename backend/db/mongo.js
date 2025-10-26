import mongoose from 'mongoose';
import { env } from '../config/env.js';


export async function connectMongo() {
mongoose.set('strictQuery', true);
await mongoose.connect(env.MONGO_URI, { maxPoolSize: 20 });
console.log('[mongo] connected:', env.MONGO_URI);
}