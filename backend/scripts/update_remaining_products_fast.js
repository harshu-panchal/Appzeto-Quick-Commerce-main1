import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Fetching uploaded resources from Cloudinary...');

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

console.log(`Found ${resources.length} total images in new Cloudinary account '${process.env.CLOUDINARY_CLOUD_NAME}'.`);

const secureUrls = resources.map(r => r.secure_url);
const productUrls = resources.filter(r => r.public_id.includes('product') || r.public_id.includes('plusway') || r.public_id.includes('categories')).map(r => r.secure_url);

const pool = productUrls.length > 0 ? productUrls : secureUrls;
console.log(`Pool size for updating products: ${pool.length}`);

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const products = await db.collection('products').find({}).toArray();
let updatedCount = 0;
let urlIdx = 0;

for (const p of products) {
  let needsUpdate = false;
  const newImages = [];

  if (Array.isArray(p.images) && p.images.length > 0) {
    for (const img of p.images) {
      if (typeof img === 'string' && !img.includes(process.env.CLOUDINARY_CLOUD_NAME)) {
        needsUpdate = true;
        const replacementUrl = pool[urlIdx % pool.length];
        urlIdx++;
        newImages.push(replacementUrl);
      } else {
        newImages.push(img);
      }
    }
  } else {
    needsUpdate = true;
    const replacementUrl = pool[urlIdx % pool.length];
    urlIdx++;
    newImages.push(replacementUrl);
  }

  if (needsUpdate) {
    await db.collection('products').updateOne(
      { _id: p._id },
      { $set: { images: newImages } }
    );
    updatedCount++;
  }
}

console.log(`SUCCESS! Updated ${updatedCount} remaining product documents with valid Cloudinary URLs.`);

await mongoose.disconnect();
