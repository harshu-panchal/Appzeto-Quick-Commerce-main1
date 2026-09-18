import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const products = await db.collection('products').find({}).toArray();

console.log('Sample matched products (name -> mainImage):');
for (const p of products.slice(0, 25)) {
  console.log(`- Product: "${p.name}" (${p.brand || 'No brand'}) -> ${p.mainImage}`);
}

await mongoose.disconnect();
