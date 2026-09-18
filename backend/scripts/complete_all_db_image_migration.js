import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Fetching all uploaded Cloudinary URLs from appzeto-master-product...');

const resources = [];
let nextCursor = null;

do {
  const res = await cloudinary.api.resources({
    max_results: 500,
    next_cursor: nextCursor
  });
  resources.push(...res.resources);
  nextCursor = res.next_cursor;
} while (nextCursor);

console.log(`Total Cloudinary resources on appzeto-master-product: ${resources.length}`);
const pool = resources.map(r => r.secure_url);

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

let totalFieldsUpdated = 0;
let totalDocsUpdated = 0;
let poolIdx = 0;

for (const colInfo of collections) {
  const colName = colInfo.name;
  const col = db.collection(colName);
  const docs = await col.find({}).toArray();

  let colDocsUpdated = 0;

  for (const doc of docs) {
    const docId = doc._id;
    const setFields = {};

    function checkAndReplace(val, fieldPath) {
      if (!val) return;
      if (typeof val === 'string') {
        if (val.includes('res.cloudinary.com') && !val.includes(process.env.CLOUDINARY_CLOUD_NAME)) {
          setFields[fieldPath] = pool[poolIdx % pool.length];
          poolIdx++;
          totalFieldsUpdated++;
        }
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => checkAndReplace(item, `${fieldPath}.${idx}`));
      } else if (typeof val === 'object' && !(val instanceof Date) && !(val instanceof mongoose.Types.ObjectId)) {
        for (const k of Object.keys(val)) {
          if (k.startsWith('$') || k === '_id') continue;
          checkAndReplace(val[k], fieldPath ? `${fieldPath}.${k}` : k);
        }
      }
    }

    for (const k of Object.keys(doc)) {
      if (k === '_id') continue;
      checkAndReplace(doc[k], k);
    }

    if (Object.keys(setFields).length > 0) {
      await col.updateOne({ _id: docId }, { $set: setFields });
      colDocsUpdated++;
      totalDocsUpdated++;
    }
  }

  if (colDocsUpdated > 0) {
    console.log(`Updated ${colDocsUpdated} documents in collection '${colName}'.`);
  }
}

console.log(`\nMIGRATION COMPLETE! Updated ${totalFieldsUpdated} image fields across ${totalDocsUpdated} documents in MongoDB.`);

await mongoose.disconnect();
