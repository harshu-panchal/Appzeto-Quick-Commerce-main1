import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CLOUDINARY_DIR = path.resolve('..', 'cloudinary');

// 1. Build Exact Maps from local backup files & meta files & index.json
console.log('Building exact local lookup index from cloudinary folder...');

const exactUrlToPath = new Map();
const publicIdToPath = new Map();
const relPathToPath = new Map();
const filenameToPath = new Map();

// Read index.json
const indexJsonPath = path.join(CLOUDINARY_DIR, 'index.json');
if (fs.existsSync(indexJsonPath)) {
  let content = fs.readFileSync(indexJsonPath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  try {
    const indexData = JSON.parse(content);
    for (const item of indexData) {
      if (!item.local_path) continue;
      const diskPath = path.join(path.resolve('..'), item.local_path.replace(/^assets\//, ''));
      if (fs.existsSync(diskPath)) {
        if (item.secure_url) exactUrlToPath.set(item.secure_url.toLowerCase(), diskPath);
        if (item.url) exactUrlToPath.set(item.url.toLowerCase(), diskPath);
        if (item.public_id) publicIdToPath.set(item.public_id.toLowerCase(), diskPath);
      }
    }
  } catch (e) {}
}

// Recursively scan all files & meta files
function scanBackupDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanBackupDir(fullPath);
    } else if (item.endsWith('.meta.json')) {
      try {
        const meta = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const imagePath = fullPath.slice(0, -10); // remove .meta.json
        if (fs.existsSync(imagePath)) {
          if (meta.secure_url) exactUrlToPath.set(meta.secure_url.toLowerCase(), imagePath);
          if (meta.url) exactUrlToPath.set(meta.url.toLowerCase(), imagePath);
          if (meta.public_id) publicIdToPath.set(meta.public_id.toLowerCase(), imagePath);
        }
      } catch (e) {}
    } else if (item !== 'index.json') {
      const relPath = path.relative(CLOUDINARY_DIR, fullPath).replace(/\\/g, '/');
      relPathToPath.set(relPath.toLowerCase(), fullPath);
      
      const ext = path.extname(relPath);
      const pubId = ext ? relPath.slice(0, relPath.length - ext.length) : relPath;
      if (!publicIdToPath.has(pubId.toLowerCase())) {
        publicIdToPath.set(pubId.toLowerCase(), fullPath);
      }

      const base = path.basename(relPath).toLowerCase();
      if (!filenameToPath.has(base)) {
        filenameToPath.set(base, fullPath);
      }
    }
  }
}

scanBackupDir(CLOUDINARY_DIR);

console.log(`Index loaded: ${exactUrlToPath.size} exact URLs, ${publicIdToPath.size} public IDs, ${filenameToPath.size} filenames.`);

// 2. Connect DB
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

const exactMatches = [];
const unmatched = [];

for (const colInfo of collections) {
  const colName = colInfo.name;
  const docs = await db.collection(colName).find({}).toArray();

  for (const doc of docs) {
    function checkValue(val, fieldPath) {
      if (!val || typeof val !== 'string') return;
      if (val.includes('cloudinary') || val.includes('res.cloudinary.com') || val.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
        const lowerVal = val.toLowerCase();

        // Check 1: Exact URL
        let matchedFile = exactUrlToPath.get(lowerVal);

        // Check 2: Public ID extracted from URL
        if (!matchedFile) {
          let uploadIdx = lowerVal.indexOf('/upload/');
          let pathAfter = uploadIdx !== -1 ? lowerVal.substring(uploadIdx + 8).replace(/^v\d+\//, '') : lowerVal;
          let ext = path.extname(pathAfter);
          let pubId = ext ? pathAfter.slice(0, pathAfter.length - ext.length) : pathAfter;

          matchedFile = publicIdToPath.get(pubId) || relPathToPath.get(pathAfter);
        }

        // Check 3: Filename match ONLY if filename is specific (not generic like image.png)
        if (!matchedFile) {
          let base = path.basename(val).toLowerCase();
          if (base.length > 8 && !base.startsWith('image') && !base.startsWith('sample')) {
            matchedFile = filenameToPath.get(base);
          }
        }

        if (matchedFile && fs.existsSync(matchedFile)) {
          exactMatches.push({ colName, docId: doc._id, fieldPath, url: val, matchedFile });
        } else {
          unmatched.push({ colName, docId: doc._id, fieldPath, url: val });
        }
      }
    }

    function recursiveScan(obj, currentPath) {
      if (!obj) return;
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => recursiveScan(item, `${currentPath}.${idx}`));
      } else if (typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof mongoose.Types.ObjectId)) {
        for (const k of Object.keys(obj)) {
          if (k.startsWith('$') || k === '_id') continue;
          recursiveScan(obj[k], currentPath ? `${currentPath}.${k}` : k);
        }
      } else {
        checkValue(obj, currentPath);
      }
    }

    for (const k of Object.keys(doc)) {
      if (k === '_id') continue;
      recursiveScan(doc[k], k);
    }
  }
}

console.log(`\nResults:`);
console.log(`EXACT Matches: ${exactMatches.length}`);
console.log(`Unmatched: ${unmatched.length}`);

const uniqueLocalFilesToUpload = new Set(exactMatches.map(m => m.matchedFile));
console.log(`Unique local files that need to be uploaded: ${uniqueLocalFilesToUpload.size}`);

await mongoose.disconnect();
