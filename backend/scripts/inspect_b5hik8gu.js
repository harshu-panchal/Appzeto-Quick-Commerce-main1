import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CLOUDINARY_DIR = path.resolve('..', 'cloudinary');

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const b5hik8guRefs = [];
const categories = await db.collection('categories').find({}).toArray();

for (const cat of categories) {
  if (cat.image && cat.image.includes('b5hik8gu')) {
    b5hik8guRefs.push({ _id: cat._id, name: cat.name, slug: cat.slug, image: cat.image });
  }
}

console.log('Categories with b5hik8gu image:', b5hik8guRefs.length);
console.log('Sample b5hik8gu categories (first 10):', JSON.stringify(b5hik8guRefs.slice(0, 10), null, 2));

// Check products as well
const products = await db.collection('products').find({}).toArray();
const b5hik8guProducts = [];
for (const p of products) {
  if (Array.isArray(p.images)) {
    for (const img of p.images) {
      if (typeof img === 'string' && img.includes('b5hik8gu')) {
        b5hik8guProducts.push({ _id: p._id, name: p.name, image: img });
      }
    }
  }
}
console.log('Products with b5hik8gu image:', b5hik8guProducts.length);

await mongoose.disconnect();
