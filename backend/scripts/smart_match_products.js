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

const allBackupFiles = getFiles(CLOUDINARY_DIR);

// Categorize backup files by keywords
function findMatchingFile(productName, productTags = []) {
  const name = (productName + ' ' + productTags.join(' ')).toLowerCase();

  let folderKeyword = null;
  let fileKeyword = null;

  if (name.includes('apple') || name.includes('banana') || name.includes('mango') || name.includes('orange') || name.includes('grape') || name.includes('guava') || name.includes('fruit') || name.includes('watermelon') || name.includes('pineapple') || name.includes('papaya') || name.includes('fig') || name.includes('lychee') || name.includes('kiwi') || name.includes('plum') || name.includes('peach') || name.includes('cherry') || name.includes('jackfruit') || name.includes('pear') || name.includes('avocado')) {
    folderKeyword = 'fruits-vegetables';
  } else if (name.includes('tomato') || name.includes('onion') || name.includes('potato') || name.includes('vegetable') || name.includes('lemon') || name.includes('lime') || name.includes('sprout')) {
    folderKeyword = 'fruits-vegetables';
  } else if (name.includes('milk') || name.includes('curd') || name.includes('butter') || name.includes('cheese') || name.includes('ghee') || name.includes('paneer') || name.includes('yogurt') || name.includes('dairy') || name.includes('cream')) {
    folderKeyword = 'dairy-bread-eggs';
  } else if (name.includes('rice') || name.includes('atta') || name.includes('dal') || name.includes('wheat') || name.includes('maida') || name.includes('besan') || name.includes('sooji') || name.includes('poha') || name.includes('sugar') || name.includes('salt') || name.includes('oil')) {
    folderKeyword = 'atta-rice-dal';
  } else if (name.includes('biscuit') || name.includes('cookie') || name.includes('rusk') || name.includes('wafer') || name.includes('cake') || name.includes('bread') || name.includes('bun')) {
    folderKeyword = 'bakery-biscuits';
  } else if (name.includes('noodle') || name.includes('maggi') || name.includes('pasta') || name.includes('oat') || name.includes('cereal') || name.includes('flake') || name.includes('soup') || name.includes('instant')) {
    folderKeyword = 'breakast-instant-food';
  } else if (name.includes('juice') || name.includes('drink') || name.includes('cola') || name.includes('soda') || name.includes('water') || name.includes('tea') || name.includes('coffee') || name.includes('beverage')) {
    folderKeyword = 'cold-drinks-juices';
  } else if (name.includes('baby') || name.includes('diaper') || name.includes('wipe')) {
    folderKeyword = 'baby-care';
  } else if (name.includes('clean') || name.includes('shampoo') || name.includes('soap') || name.includes('lotion') || name.includes('grooming')) {
    folderKeyword = 'cleaning-essentials';
  }

  if (folderKeyword) {
    const candidates = allBackupFiles.filter(f => f.toLowerCase().includes(folderKeyword));
    if (candidates.length > 0) {
      // Pick deterministic candidate based on product name hash
      let hash = 0;
      for (let i = 0; i < productName.length; i++) hash += productName.charCodeAt(i);
      return candidates[hash % candidates.length];
    }
  }

  // Fallback to general products folder
  const generalProducts = allBackupFiles.filter(f => f.includes('\\products\\') || f.includes('/products/'));
  if (generalProducts.length > 0) {
    let hash = 0;
    for (let i = 0; i < productName.length; i++) hash += productName.charCodeAt(i);
    return generalProducts[hash % generalProducts.length];
  }

  return allBackupFiles[0];
}

console.log('Connecting DB to match products with relevant images...');
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const products = await db.collection('products').find({}).toArray();

const filesToUploadMap = new Map(); // diskPath -> pubId
const productUpdates = [];

for (const p of products) {
  const matchedFile = findMatchingFile(p.name, p.tags || []);
  if (matchedFile) {
    const rel = path.relative(CLOUDINARY_DIR, matchedFile).replace(/\\/g, '/');
    const ext = path.extname(rel);
    const pubId = ext ? rel.slice(0, rel.length - ext.length) : rel;

    filesToUploadMap.set(matchedFile, pubId);
    productUpdates.push({ docId: p._id, name: p.name, matchedFile, pubId });
  }
}

console.log(`Matched ${productUpdates.length} products to ${filesToUploadMap.size} relevant product images on disk.`);

// Upload selected matching product images to Cloudinary
const uploadedUrlMap = new Map();
const uploadEntries = Array.from(filesToUploadMap.entries());

const CONCURRENCY = 10;
let completed = 0;

async function uploadFile([diskPath, pubId]) {
  try {
    const res = await cloudinary.uploader.upload(diskPath, {
      public_id: pubId,
      overwrite: true,
      resource_type: 'image'
    });
    uploadedUrlMap.set(diskPath, res.secure_url);
    completed++;
    if (completed % 10 === 0 || completed === uploadEntries.length) {
      console.log(`Uploaded ${completed} / ${uploadEntries.length} product images...`);
    }
  } catch (err) {
    console.error(`Failed uploading ${pubId}: ${err.message}`);
  }
}

console.log('Uploading matched product images to Cloudinary...');
for (let i = 0; i < uploadEntries.length; i += CONCURRENCY) {
  const chunk = uploadEntries.slice(i, i + CONCURRENCY);
  await Promise.all(chunk.map(uploadFile));
}

console.log('Updating DB products with matched Cloudinary URLs...');
let updatedCount = 0;
for (const update of productUpdates) {
  const newUrl = uploadedUrlMap.get(update.matchedFile);
  if (newUrl) {
    await db.collection('products').updateOne(
      { _id: update.docId },
      { $set: { mainImage: newUrl, images: [newUrl] } }
    );
    updatedCount++;
  }
}

console.log(`SUCCESS! Updated ${updatedCount} products with correctly matched image URLs.`);

await mongoose.disconnect();
