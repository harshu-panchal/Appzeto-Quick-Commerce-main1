import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const categories = await db.collection('categories').find({}).toArray();

console.log('Categories inspection (first 30):');
for (const c of categories.slice(0, 30)) {
  let pubId = c.image;
  if (c.image && c.image.includes('/upload/')) {
    pubId = c.image.split('/upload/')[1].replace(/^v\d+\//, '');
  }
  console.log(`- [${c.type}] ${c.name} (${c.slug}) -> image: ${pubId}`);
}

const products = await db.collection('products').find({}).toArray();

console.log('\nProducts inspection (first 30):');
for (const p of products.slice(0, 30)) {
  let img = p.mainImage || (Array.isArray(p.images) ? p.images[0] : null);
  let pubId = img;
  if (img && img.includes('/upload/')) {
    pubId = img.split('/upload/')[1].replace(/^v\d+\//, '');
  }
  console.log(`- ${p.name} (${p.brand}) -> image: ${pubId}`);
}

await mongoose.disconnect();
