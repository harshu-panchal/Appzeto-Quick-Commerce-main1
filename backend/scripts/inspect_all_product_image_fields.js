import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const products = await db.collection('products').find({}).toArray();
const oldFieldsMap = new Map(); // fieldPath -> count

function scanDoc(val, fieldPath) {
  if (!val) return;
  if (typeof val === 'string') {
    if (val.includes('res.cloudinary.com') && !val.includes(process.env.CLOUDINARY_CLOUD_NAME)) {
      oldFieldsMap.set(fieldPath, (oldFieldsMap.get(fieldPath) || 0) + 1);
    }
  } else if (Array.isArray(val)) {
    val.forEach((item, idx) => scanDoc(item, `${fieldPath}.${idx}`));
  } else if (typeof val === 'object' && !(val instanceof Date) && !(val instanceof mongoose.Types.ObjectId)) {
    for (const k of Object.keys(val)) {
      if (k.startsWith('$') || k === '_id') continue;
      scanDoc(val[k], fieldPath ? `${fieldPath}.${k}` : k);
    }
  }
}

for (const p of products) {
  for (const k of Object.keys(p)) {
    if (k === '_id') continue;
    scanDoc(p[k], k);
  }
}

console.log('Old Cloudinary fields in products collection breakdown:');
console.log(JSON.stringify(Object.fromEntries(oldFieldsMap), null, 2));

await mongoose.disconnect();
