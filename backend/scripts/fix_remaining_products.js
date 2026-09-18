import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

const productFiles = getFiles(path.join(CLOUDINARY_DIR, 'products'));
console.log(`Found ${productFiles.length} product files in local backup.`);

// Upload product backup files to new Cloudinary account
const CONCURRENCY = 5;
const uploadedUrls = [];
let completed = 0;

async function uploadProductFile(diskPath) {
  try {
    const rel = path.relative(CLOUDINARY_DIR, diskPath).replace(/\\/g, '/');
    const ext = path.extname(rel);
    const pubId = ext ? rel.slice(0, rel.length - ext.length) : rel;

    const res = await cloudinary.uploader.upload(diskPath, {
      public_id: pubId,
      overwrite: true,
      resource_type: 'image'
    });
    uploadedUrls.push(res.secure_url);
    completed++;
    if (completed % 20 === 0 || completed === productFiles.length) {
      console.log(`Uploaded ${completed} / ${productFiles.length} product backup files...`);
    }
  } catch (err) {
    console.error(`Failed uploading product image: ${err.message}`);
  }
}

console.log('Uploading product backup images to Cloudinary...');
for (let i = 0; i < productFiles.length; i += CONCURRENCY) {
  const chunk = productFiles.slice(i, i + CONCURRENCY);
  await Promise.all(chunk.map(uploadProductFile));
}

console.log(`Uploaded ${uploadedUrls.length} product images successfully.`);

// Connect MongoDB and update remaining products
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
        const replacementUrl = uploadedUrls[urlIdx % uploadedUrls.length];
        urlIdx++;
        newImages.push(replacementUrl);
      } else {
        newImages.push(img);
      }
    }
  } else {
    needsUpdate = true;
    const replacementUrl = uploadedUrls[urlIdx % uploadedUrls.length];
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

console.log(`Updated ${updatedCount} product documents with new Cloudinary URLs!`);

await mongoose.disconnect();
