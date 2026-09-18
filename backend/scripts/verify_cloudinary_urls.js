import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

let newAccountCount = 0;
let oldAccountCount = 0;
let nonCloudinaryCount = 0;
const collectionStats = {};

function inspectValue(val, colName) {
  if (!val) return;
  if (typeof val === 'string') {
    if (val.includes('res.cloudinary.com')) {
      if (val.includes(`res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`)) {
        newAccountCount++;
        collectionStats[colName] = collectionStats[colName] || { newAcc: 0, oldAcc: 0, other: 0 };
        collectionStats[colName].newAcc++;
      } else {
        oldAccountCount++;
        collectionStats[colName] = collectionStats[colName] || { newAcc: 0, oldAcc: 0, other: 0 };
        collectionStats[colName].oldAcc++;
      }
    } else if (val.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      nonCloudinaryCount++;
      collectionStats[colName] = collectionStats[colName] || { newAcc: 0, oldAcc: 0, other: 0 };
      collectionStats[colName].other++;
    }
  } else if (Array.isArray(val)) {
    val.forEach(item => inspectValue(item, colName));
  } else if (typeof val === 'object' && !(val instanceof Date) && !(val instanceof mongoose.Types.ObjectId)) {
    for (const k of Object.keys(val)) {
      if (k.startsWith('$') || k === '_id') continue;
      inspectValue(val[k], colName);
    }
  }
}

for (const colInfo of collections) {
  const docs = await db.collection(colInfo.name).find({}).toArray();
  for (const doc of docs) {
    for (const k of Object.keys(doc)) {
      if (k === '_id') continue;
      inspectValue(doc[k], colInfo.name);
    }
  }
}

console.log(`Cloud Name configured in ENV: ${process.env.CLOUDINARY_CLOUD_NAME}`);
console.log(`New Account Cloudinary URLs: ${newAccountCount}`);
console.log(`Old Account Cloudinary URLs: ${oldAccountCount}`);
console.log(`Other Image Strings: ${nonCloudinaryCount}`);
console.log('Collection Statistics:', JSON.stringify(collectionStats, null, 2));

await mongoose.disconnect();
