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

console.log('Scanning cloudinary dir:', CLOUDINARY_DIR);
const allLocalFiles = getFiles(CLOUDINARY_DIR);
console.log('Total local image files found:', allLocalFiles.length);

const fileMap = new Map();
for (const f of allLocalFiles) {
  const relPath = path.relative(CLOUDINARY_DIR, f).replace(/\\/g, '/');
  fileMap.set(relPath.toLowerCase(), f);
  const ext = path.extname(relPath);
  const publicId = relPath.slice(0, relPath.length - ext.length);
  fileMap.set(publicId.toLowerCase(), f);
  const basename = path.basename(relPath).toLowerCase();
  fileMap.set(basename, f);
  const nameWithoutExt = path.basename(relPath, ext).toLowerCase();
  fileMap.set(nameWithoutExt, f);
}

console.log('FileMap size:', fileMap.size);

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

let totalDbUrls = 0;
let dbUrlsMatched = 0;
const matchedSet = new Set();
const unmatchedUrls = [];
const dbImageRefs = [];

function scanValue(val, pathStr, docId, colName) {
  if (!val) return;
  if (typeof val === 'string') {
    if (val.includes('cloudinary') || val.includes('res.cloudinary.com') || val.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      dbImageRefs.push({ colName, docId, pathStr, url: val });
    }
  } else if (Array.isArray(val)) {
    val.forEach((item, idx) => scanValue(item, `${pathStr}[${idx}]`, docId, colName));
  } else if (typeof val === 'object') {
    for (const k of Object.keys(val)) {
      if (k.startsWith('$')) continue;
      scanValue(val[k], pathStr ? `${pathStr}.${k}` : k, docId, colName);
    }
  }
}

for (const colInfo of collections) {
  const col = db.collection(colInfo.name);
  const docs = await col.find({}).toArray();
  for (const doc of docs) {
    const docId = doc._id;
    for (const k of Object.keys(doc)) {
      if (k === '_id') continue;
      scanValue(doc[k], k, docId, colInfo.name);
    }
  }
}

console.log('Total image references in DB:', dbImageRefs.length);

const dbCollectionsWithImages = {};
for (const ref of dbImageRefs) {
  dbCollectionsWithImages[ref.colName] = (dbCollectionsWithImages[ref.colName] || 0) + 1;
}
console.log('DB collections breakdown:', dbCollectionsWithImages);

for (const ref of dbImageRefs) {
  totalDbUrls++;
  let url = ref.url;
  let publicIdFromUrl = '';
  const uploadIdx = url.indexOf('/upload/');
  if (uploadIdx !== -1) {
    let pathAfterUpload = url.substring(uploadIdx + 8);
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    publicIdFromUrl = pathAfterUpload;
  } else {
    publicIdFromUrl = url;
  }

  let ext = path.extname(publicIdFromUrl);
  let publicIdNoExt = ext ? publicIdFromUrl.slice(0, publicIdFromUrl.length - ext.length) : publicIdFromUrl;
  let filename = path.basename(publicIdFromUrl);
  let filenameNoExt = ext ? path.basename(publicIdFromUrl, ext) : filename;

  const match = fileMap.get(publicIdFromUrl.toLowerCase()) ||
                fileMap.get(publicIdNoExt.toLowerCase()) ||
                fileMap.get(filename.toLowerCase()) ||
                fileMap.get(filenameNoExt.toLowerCase());

  if (match) {
    dbUrlsMatched++;
    matchedSet.add(url);
  } else {
    unmatchedUrls.push({ col: ref.colName, path: ref.pathStr, url });
  }
}

const summaryText = [
  `Scanning cloudinary dir: ${CLOUDINARY_DIR}`,
  `Total local image files found: ${allLocalFiles.length}`,
  `FileMap size: ${fileMap.size}`,
  `Total image references in DB: ${dbImageRefs.length}`,
  `DB collections breakdown: ${JSON.stringify(dbCollectionsWithImages, null, 2)}`,
  `Matched ${dbUrlsMatched} / ${totalDbUrls} DB URLs to local backup files!`,
  `Unique matched URLs: ${matchedSet.size}`,
  `Unmatched DB URLs count: ${unmatchedUrls.length}`,
  `Unmatched samples: ${JSON.stringify(unmatchedUrls.slice(0, 10), null, 2)}`
].join('\n');

fs.writeFileSync('inspect.log', summaryText, 'utf8');
console.log(summaryText);

await mongoose.disconnect();
