import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const categories = await db.collection('categories').find({}).toArray();
const products = await db.collection('products').find({}).toArray();

const catLog = categories.map(c => {
  let img = c.image || '';
  return { name: c.name, type: c.type, slug: c.slug, image: img };
});

const prodLog = products.map(p => {
  let img = p.mainImage || (Array.isArray(p.images) ? p.images[0] : '');
  return { name: p.name, brand: p.brand, slug: p.slug, image: img };
});

fs.writeFileSync('category_images.json', JSON.stringify(catLog, null, 2));
fs.writeFileSync('product_images.json', JSON.stringify(prodLog, null, 2));

console.log('Categories count:', catLog.length);
console.log('Products count:', prodLog.length);

await mongoose.disconnect();
