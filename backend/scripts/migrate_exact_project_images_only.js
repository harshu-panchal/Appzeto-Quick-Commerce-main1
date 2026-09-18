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

console.log(`Target Cloudinary Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);

const CLOUDINARY_DIR = path.resolve('..', 'cloudinary');

// 1. Build Exact Lookup Index
console.log('Building exact local lookup index from cloudinary folder...');

const exactUrlToPath = new Map();
const publicIdToPath = new Map();
const relPathToPath = new Map();
const filenameToPath = new Map();

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
        const imagePath = fullPath.slice(0, -10);
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

// 2. Connect DB & Identify Exact Matches
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

const fileToDbRefs = new Map(); // diskPath -> Array of { colName, docId, fieldPath }
let totalMatchedRefs = 0;

for (const colInfo of collections) {
  const colName = colInfo.name;
  const docs = await db.collection(colName).find({}).toArray();

  for (const doc of docs) {
    function checkValue(val, fieldPath) {
      if (!val || typeof val !== 'string') return;
      if (val.includes('cloudinary') || val.includes('res.cloudinary.com') || val.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
        const lowerVal = val.toLowerCase();

        // 1. Exact URL
        let matchedFile = exactUrlToPath.get(lowerVal);

        // 2. Public ID or Relative path
        if (!matchedFile) {
          let uploadIdx = lowerVal.indexOf('/upload/');
          let pathAfter = uploadIdx !== -1 ? lowerVal.substring(uploadIdx + 8).replace(/^v\d+\//, '') : lowerVal;
          let ext = path.extname(pathAfter);
          let pubId = ext ? pathAfter.slice(0, pathAfter.length - ext.length) : pathAfter;

          matchedFile = publicIdToPath.get(pubId) || relPathToPath.get(pathAfter);
        }

        // 3. Filename match if specific
        if (!matchedFile) {
          let base = path.basename(val).toLowerCase();
          if (base.length > 8 && !base.startsWith('image') && !base.startsWith('sample')) {
            matchedFile = filenameToPath.get(base);
          }
        }

        if (matchedFile && fs.existsSync(matchedFile)) {
          if (!fileToDbRefs.has(matchedFile)) {
            fileToDbRefs.set(matchedFile, []);
          }
          fileToDbRefs.get(matchedFile).push({ colName, docId: doc._id, fieldPath, oldUrl: val });
          totalMatchedRefs++;
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

console.log(`Identified ${fileToDbRefs.size} unique local files matching ${totalMatchedRefs} DB fields.`);

// 3. Upload ONLY these exact matched files to Cloudinary
function getPublicIdFromDiskPath(diskPath) {
  const rel = path.relative(CLOUDINARY_DIR, diskPath).replace(/\\/g, '/');
  const ext = path.extname(rel);
  return ext ? rel.slice(0, rel.length - ext.length) : rel;
}

const uploadedNewUrlsMap = new Map(); // diskPath -> newSecureUrl
const entriesToUpload = Array.from(fileToDbRefs.keys());

const CONCURRENCY = 5;
let completed = 0;
let failed = 0;

console.log(`Uploading ${entriesToUpload.length} exact project files to Cloudinary...`);

async function uploadSingleFile(diskPath) {
  const pubId = getPublicIdFromDiskPath(diskPath);
  try {
    const res = await cloudinary.uploader.upload(diskPath, {
      public_id: pubId,
      overwrite: true,
      resource_type: 'image'
    });
    uploadedNewUrlsMap.set(diskPath, res.secure_url);
    completed++;
    if (completed % 25 === 0 || completed === entriesToUpload.length) {
      console.log(`Uploaded ${completed} / ${entriesToUpload.length} exact files...`);
    }
  } catch (err) {
    console.error(`Error uploading ${pubId}: ${err.message}`);
    failed++;
  }
}

for (let i = 0; i < entriesToUpload.length; i += CONCURRENCY) {
  const chunk = entriesToUpload.slice(i, i + CONCURRENCY);
  await Promise.all(chunk.map(uploadSingleFile));
}

console.log(`Finished uploading: ${uploadedNewUrlsMap.size} uploaded successfully, ${failed} failed.`);

// 4. Update MongoDB documents with EXACT new URLs
console.log('Updating MongoDB with exact matched URLs...');

const dbUpdatesByCol = new Map(); // colName -> Map(docId -> { fieldPath: newUrl })

for (const [diskPath, dbRefs] of fileToDbRefs.entries()) {
  const newUrl = uploadedNewUrlsMap.get(diskPath);
  if (!newUrl) continue;

  for (const ref of dbRefs) {
    if (!dbUpdatesByCol.has(ref.colName)) dbUpdatesByCol.set(ref.colName, new Map());
    const colMap = dbUpdatesByCol.get(ref.colName);
    const docIdStr = ref.docId.toString();
    if (!colMap.has(docIdStr)) colMap.set(docIdStr, { docId: ref.docId, fields: {} });
    colMap.get(docIdStr).fields[ref.fieldPath] = newUrl;
  }
}

let totalDocsUpdated = 0;

for (const [colName, docMap] of dbUpdatesByCol.entries()) {
  const col = db.collection(colName);
  let colCount = 0;

  for (const { docId, fields } of docMap.values()) {
    const setQuery = {};
    for (const [fPath, newUrl] of Object.entries(fields)) {
      setQuery[fPath] = newUrl;
    }
    await col.updateOne({ _id: docId }, { $set: setQuery });
    colCount++;
    totalDocsUpdated++;
  }

  console.log(`Collection '${colName}': updated ${colCount} documents.`);
}

console.log(`\nEXACT MIGRATION SUCCESSFUL! Updated ${totalDocsUpdated} documents across MongoDB.`);

await mongoose.disconnect();
