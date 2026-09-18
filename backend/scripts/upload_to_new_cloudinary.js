import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

// Configure Cloudinary with ENV
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Using Cloudinary Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

const CLOUDINARY_DIR = path.resolve('..', 'cloudinary');

// Helper to recursively list files
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

// 1. Build File Lookup Index
console.log('Scanning local backup directory:', CLOUDINARY_DIR);
const allFiles = getFiles(CLOUDINARY_DIR);
console.log(`Found ${allFiles.length} image files in backup folder.`);

const exactUrlMap = new Map();
const publicIdMap = new Map();
const relPathMap = new Map();
const filenameMap = new Map();

// Read index.json if available
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
        if (item.secure_url) exactUrlMap.set(item.secure_url, diskPath);
        if (item.url) exactUrlMap.set(item.url, diskPath);
        if (item.public_id) publicIdMap.set(item.public_id.toLowerCase(), diskPath);
      }
    }
  } catch (e) {
    console.warn('Warning parsing index.json:', e.message);
  }
}

for (const f of allFiles) {
  const relPath = path.relative(CLOUDINARY_DIR, f).replace(/\\/g, '/');
  relPathMap.set(relPath.toLowerCase(), f);
  
  const ext = path.extname(relPath);
  const pubId = ext ? relPath.slice(0, relPath.length - ext.length) : relPath;
  if (!publicIdMap.has(pubId.toLowerCase())) {
    publicIdMap.set(pubId.toLowerCase(), f);
  }

  const base = path.basename(relPath).toLowerCase();
  if (!filenameMap.has(base)) {
    filenameMap.set(base, f);
  }
}

// 2. Connect DB
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

// 3. Scan DB Collections for Image URLs
console.log('Scanning MongoDB database collections...');
const dbUpdatesMap = new Map(); // colName -> Array of { docId, updates: { path: newUrl } }
const filesToUpload = new Map(); // diskPath -> { publicId, originalUrls: [] }

function getPublicIdFromDiskPath(diskPath) {
  const rel = path.relative(CLOUDINARY_DIR, diskPath).replace(/\\/g, '/');
  const ext = path.extname(rel);
  return ext ? rel.slice(0, rel.length - ext.length) : rel;
}

// Category fallback images pool
const categoryBackupFiles = allFiles.filter(f => f.includes('\\categories\\') || f.includes('/categories/'));
let catFallbackIndex = 0;

for (const colInfo of collections) {
  const colName = colInfo.name;
  const col = db.collection(colName);
  const docs = await col.find({}).toArray();

  for (const doc of docs) {
    const docId = doc._id;
    const pendingUpdates = {};

    function processField(val, fieldPath) {
      if (!val) return;
      if (typeof val === 'string') {
        if (val.includes('cloudinary') || val.includes('res.cloudinary.com') || val.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
          // Find matching local file
          let matchedDiskPath = exactUrlMap.get(val);

          if (!matchedDiskPath) {
            let u = val;
            let uploadIdx = u.indexOf('/upload/');
            let pathAfter = uploadIdx !== -1 ? u.substring(uploadIdx + 8).replace(/^v\d+\//, '') : u;
            let ext = path.extname(pathAfter);
            let pubId = ext ? pathAfter.slice(0, pathAfter.length - ext.length) : pathAfter;
            let base = path.basename(pathAfter).toLowerCase();

            matchedDiskPath = relPathMap.get(pathAfter.toLowerCase()) ||
                              publicIdMap.get(pubId.toLowerCase()) ||
                              filenameMap.get(base);
          }

          // Fallback logic for broken b5hik8gu category images if not directly matched
          if (!matchedDiskPath && colName === 'categories' && categoryBackupFiles.length > 0) {
            matchedDiskPath = categoryBackupFiles[catFallbackIndex % categoryBackupFiles.length];
            catFallbackIndex++;
          }

          if (matchedDiskPath && fs.existsSync(matchedDiskPath)) {
            const pubId = getPublicIdFromDiskPath(matchedDiskPath);
            if (!filesToUpload.has(matchedDiskPath)) {
              filesToUpload.set(matchedDiskPath, { publicId: pubId, dbRefs: [] });
            }
            filesToUpload.get(matchedDiskPath).dbRefs.push({ colName, docId, fieldPath, oldUrl: val });
          }
        }
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => processField(item, `${fieldPath}.${idx}`));
      } else if (typeof val === 'object' && !(val instanceof Date) && !(val instanceof mongoose.Types.ObjectId)) {
        for (const k of Object.keys(val)) {
          if (k.startsWith('$') || k === '_id') continue;
          processField(val[k], fieldPath ? `${fieldPath}.${k}` : k);
        }
      }
    }

    for (const k of Object.keys(doc)) {
      if (k === '_id') continue;
      processField(doc[k], k);
    }
  }
}

console.log(`Identified ${filesToUpload.size} distinct local backup files to upload for project DB references.`);

// 4. Also include category & banner & product & app-setting backup files to ensure complete UI coverage
const priorityDirs = ['categories', 'subcategories', 'banners', 'experience-banners', 'app-settings', 'popups', 'promo-strips', 'range-cards', 'sellers', 'default'];
for (const f of allFiles) {
  const rel = path.relative(CLOUDINARY_DIR, f).replace(/\\/g, '/');
  const topFolder = rel.split('/')[0];
  if (priorityDirs.includes(topFolder) && !filesToUpload.has(f)) {
    const pubId = getPublicIdFromDiskPath(f);
    filesToUpload.set(f, { publicId: pubId, dbRefs: [] });
  }
}

console.log(`Total local files queued for Cloudinary upload (including UI assets): ${filesToUpload.size}`);

// 5. Upload files to Cloudinary in batches
const uploadedUrlMap = new Map(); // diskPath -> newSecureUrl
const uploadEntries = Array.from(filesToUpload.entries());

const CONCURRENCY = 5;
let completed = 0;
let failed = 0;

console.log(`Starting upload to Cloudinary account '${process.env.CLOUDINARY_CLOUD_NAME}'...`);

async function uploadFile([diskPath, info]) {
  try {
    const res = await cloudinary.uploader.upload(diskPath, {
      public_id: info.publicId,
      overwrite: true,
      resource_type: 'image'
    });
    uploadedUrlMap.set(diskPath, res.secure_url);
    completed++;
    if (completed % 10 === 0 || completed === uploadEntries.length) {
      console.log(`Uploaded ${completed} / ${uploadEntries.length} files...`);
    }
  } catch (err) {
    console.error(`Failed to upload ${info.publicId}: ${err.message}`);
    failed++;
  }
}

for (let i = 0; i < uploadEntries.length; i += CONCURRENCY) {
  const chunk = uploadEntries.slice(i, i + CONCURRENCY);
  await Promise.all(chunk.map(uploadFile));
}

console.log(`Upload finished! Successfully uploaded ${uploadedUrlMap.size} files (${failed} failed).`);

// 6. Update MongoDB documents
console.log('Updating MongoDB documents with new Cloudinary URLs...');

// Group DB updates by colName and docId
const updatesByCol = new Map(); // colName -> Map(docId -> { fieldPath: newUrl })

for (const [diskPath, info] of filesToUpload.entries()) {
  const newUrl = uploadedUrlMap.get(diskPath);
  if (!newUrl) continue;

  for (const ref of info.dbRefs) {
    if (!updatesByCol.has(ref.colName)) updatesByCol.set(ref.colName, new Map());
    const colMap = updatesByCol.get(ref.colName);
    if (!colMap.has(ref.docId.toString())) colMap.set(ref.docId.toString(), { docId: ref.docId, fields: {} });
    colMap.get(ref.docId.toString()).fields[ref.fieldPath] = newUrl;
  }
}

let totalDocsUpdated = 0;

for (const [colName, docMap] of updatesByCol.entries()) {
  const col = db.collection(colName);
  let colUpdatedCount = 0;

  for (const { docId, fields } of docMap.values()) {
    const setQuery = {};
    for (const [fPath, newUrl] of Object.entries(fields)) {
      setQuery[fPath] = newUrl;
    }
    await col.updateOne({ _id: docId }, { $set: setQuery });
    colUpdatedCount++;
    totalDocsUpdated++;
  }

  console.log(`Collection '${colName}': updated ${colUpdatedCount} documents.`);
}

console.log(`SUCCESS! Updated ${totalDocsUpdated} total documents in MongoDB.`);

await mongoose.disconnect();
