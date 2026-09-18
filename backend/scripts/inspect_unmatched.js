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
console.log('Total files on disk:', allFiles.length);

const byRelPath = new Map();
const byPublicId = new Map();
const byBasename = new Map();

for (const f of allFiles) {
  const relPath = path.relative(CLOUDINARY_DIR, f).replace(/\\/g, '/');
  byRelPath.set(relPath.toLowerCase(), f);
  
  const ext = path.extname(relPath);
  const pubId = ext ? relPath.slice(0, relPath.length - ext.length) : relPath;
  byPublicId.set(pubId.toLowerCase(), f);

  const base = path.basename(relPath).toLowerCase();
  if (!byBasename.has(base)) byBasename.set(base, f);
}

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

const dbRefs = [];
function scan(val, pathStr, doc, col) {
  if (!val) return;
  if (typeof val === 'string') {
    if (val.includes('cloudinary') || val.includes('res.cloudinary.com') || val.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      dbRefs.push({ col, docId: doc._id, docName: doc.name || doc.title || doc.slug, path: pathStr, url: val });
    }
  } else if (Array.isArray(val)) {
    val.forEach((item, idx) => scan(item, `${pathStr}[${idx}]`, doc, col));
  } else if (typeof val === 'object') {
    for (const k of Object.keys(val)) {
      if (k.startsWith('$') || k === '_id') continue;
      scan(val[k], pathStr ? `${pathStr}.${k}` : k, doc, col);
    }
  }
}

for (const colInfo of collections) {
  const docs = await db.collection(colInfo.name).find({}).toArray();
  for (const doc of docs) {
    scan(doc, '', doc, colInfo.name);
  }
}

console.log('Total DB refs:', dbRefs.length);

let matchedCount = 0;
const unmatched = [];
const matchedMap = new Map();

for (const ref of dbRefs) {
  let u = ref.url;
  let uploadIdx = u.indexOf('/upload/');
  let pathAfterUpload = uploadIdx !== -1 ? u.substring(uploadIdx + 8).replace(/^v\d+\//, '') : u;
  
  let ext = path.extname(pathAfterUpload);
  let pubId = ext ? pathAfterUpload.slice(0, pathAfterUpload.length - ext.length) : pathAfterUpload;
  let base = path.basename(pathAfterUpload);
  
  let fileMatch = byRelPath.get(pathAfterUpload.toLowerCase()) ||
                    byPublicId.get(pubId.toLowerCase()) ||
                    byBasename.get(base.toLowerCase());
                    
  if (fileMatch) {
    matchedCount++;
    matchedMap.set(u, fileMatch);
  } else {
    unmatched.push({ col: ref.col, path: ref.path, docName: ref.docName, url: u });
  }
}

const cloudNames = {};
for (const un of unmatched) {
  let cloud = 'other';
  if (un.url.includes('res.cloudinary.com/')) {
    const parts = un.url.split('res.cloudinary.com/')[1].split('/');
    cloud = parts[0];
  }
  cloudNames[cloud] = (cloudNames[cloud] || 0) + 1;
}

const output = [
  `Matched: ${matchedCount} / ${dbRefs.length}`,
  `Unique matched URLs: ${matchedMap.size}`,
  `Unmatched count: ${unmatched.length}`,
  `Unmatched Cloudinary accounts breakdown: ${JSON.stringify(cloudNames, null, 2)}`,
  `Unmatched sample list: ${JSON.stringify(unmatched.slice(0, 30), null, 2)}`
].join('\n');

fs.writeFileSync('inspect_unmatched.log', output, 'utf8');
console.log('Wrote inspect_unmatched.log');

await mongoose.disconnect();
