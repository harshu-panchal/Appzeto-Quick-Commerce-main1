import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CLOUDINARY_DIR = path.resolve('..', 'cloudinary');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, fileList);
    } else if (!file.endsWith('.meta.json') && file !== 'index.json') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getFiles(CLOUDINARY_DIR);
const fileBasenames = new Map();
const pubIdMap = new Map();
for (const f of allFiles) {
  const relPath = path.relative(CLOUDINARY_DIR, f).replace(/\\/g, '/');
  const ext = path.extname(relPath);
  const pubId = ext ? relPath.slice(0, relPath.length - ext.length) : relPath;
  pubIdMap.set(pubId.toLowerCase(), f);
  fileBasenames.set(path.basename(f).toLowerCase(), f);
}

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const products = await db.collection('products').find({}).toArray();
const remaining = [];

for (const p of products) {
  if (Array.isArray(p.images)) {
    p.images.forEach((img, idx) => {
      if (typeof img === 'string' && !img.includes(process.env.CLOUDINARY_CLOUD_NAME)) {
        let uploadIdx = img.indexOf('/upload/');
        let pathAfter = uploadIdx !== -1 ? img.substring(uploadIdx + 8).replace(/^v\d+\//, '') : img;
        let ext = path.extname(pathAfter);
        let pubId = ext ? pathAfter.slice(0, pathAfter.length - ext.length) : pathAfter;
        let base = path.basename(pathAfter).toLowerCase();

        let matched = pubIdMap.get(pubId.toLowerCase()) || fileBasenames.get(base);
        remaining.push({ productId: p._id, productName: p.name, field: `images.${idx}`, url: img, matchedOnDisk: matched || false });
      }
    });
  }
}

console.log('Remaining old product image refs:', remaining.length);
console.log('Sample remaining product images (first 10):', JSON.stringify(remaining.slice(0, 10), null, 2));

const matchedOnDiskCount = remaining.filter(r => r.matchedOnDisk).length;
console.log(`Matched on disk count for remaining: ${matchedOnDiskCount}`);

await mongoose.disconnect();
