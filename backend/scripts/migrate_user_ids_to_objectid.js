#!/usr/bin/env node
/**
 * Migration script: convert string user id fields to ObjectId where possible
 * Usage: node scripts/migrate_user_ids_to_objectid.js
 * Make a DB backup before running.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/revibe';

const collectionsToFix = [
  { name: 'listings', fields: ['seller_id'] },
  { name: 'orders', fields: ['buyer_id', 'seller_id'] },
  { name: 'carts', fields: ['buyer_id'] },
  { name: 'conversations', fields: ['buyer_id', 'seller_id', 'participants'] },
  { name: 'messages', fields: ['from_id', 'to_id'] },
];

function toObjectIdIfValid(val) {
  if (val == null) return null;
  if (typeof val === 'object' && val._bsontype === 'ObjectID') return val;
  const s = String(val);
  if (mongoose.Types.ObjectId.isValid(s)) return new mongoose.Types.ObjectId(s);
  return null;
}

async function run() {
  console.log('Connecting to', MONGO);
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  try {
    for (const col of collectionsToFix) {
      const coll = db.collection(col.name);
      console.log(`Processing collection ${col.name}`);
      const cursor = coll.find({});
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const updates = {};
        for (const f of col.fields) {
          if (f === 'participants' && Array.isArray(doc.participants)) {
            const newParts = doc.participants.map((p) => {
              if (!p) return p;
              if (typeof p === 'object') {
                // convert fields named user_id or userId
                if (p.user_id || p.userId) {
                  const raw = p.user_id || p.userId;
                  const oid = toObjectIdIfValid(raw);
                  return { ...p, user_id: oid ?? raw };
                }
                return p;
              }
              // primitive id
              const oid = toObjectIdIfValid(p);
              return oid ?? p;
            });
            updates.participants = newParts;
            continue;
          }

          const raw = doc[f];
          if (raw == null) continue;
          if (Array.isArray(raw)) {
            const mapped = raw.map((v) => toObjectIdIfValid(v) ?? v);
            updates[f] = mapped;
          } else {
            const oid = toObjectIdIfValid(raw);
            if (oid) updates[f] = oid;
          }
        }
        if (Object.keys(updates).length) {
          await coll.updateOne({ _id: doc._id }, { $set: updates });
          console.log(`Updated doc ${doc._id} in ${col.name}:`, Object.keys(updates));
        }
      }
    }
    console.log('Migration completed');
  } catch (err) {
    console.error('Migration error', err);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
