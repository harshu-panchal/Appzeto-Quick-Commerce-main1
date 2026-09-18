import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CLOUDINARY_DIR = path.resolve('..', 'cloudinary');
const indexJsonPath = path.join(CLOUDINARY_DIR, 'index.json');
let content = fs.readFileSync(indexJsonPath, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
const indexData = JSON.parse(content);

console.log('Total entries in index.json:', indexData.length);

const urlMap = new Map();
const pubIdMap = new Map();
const baseMap = new Map();

for (const item of indexData) {
  const diskPath = path.join(path.resolve('..'), item.local_path.replace(/^assets\//, ''));
  if (item.secure_url) urlMap.set(item.secure_url, diskPath);
  if (item.url) urlMap.set(item.url, diskPath);
  if (item.public_id) {
    pubIdMap.set(item.public_id.toLowerCase(), diskPath);
  }
  const base = path.basename(item.local_path).toLowerCase();
  baseMap.set(base, diskPath);
}

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();

const dbRefs = [];
function scan(val, pathStr, doc, col) {
  if (!val) return;
  if (typeof val === 'string') {
    if (val.includes('cloudinary') || val.includes('res.cloudinary.com') || val.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      dbRefs.push({ col, docId: doc._id, path: pathStr, url: val });
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
  for (const doc of docs) scan(doc, '', doc, colInfo.name);
}

let matchedExactUrl = 0;
let matchedPubId = 0;
let matchedBase = 0;
let unmatched = 0;

const toUpload = new Map();

for (const ref of dbRefs) {
  let match = urlMap.get(ref.url);
  if (match) {
    matchedExactUrl++;
  } else {
    let u = ref.url;
    let uploadIdx = u.indexOf('/upload/');
    let pathAfter = uploadIdx !== -1 ? u.substring(uploadIdx + 8).replace(/^v\d+\//, '') : u;
    let ext = path.extname(pathAfter);
    let pubId = ext ? pathAfter.slice(0, pathAfter.length - ext.length) : pathAfter;
    let base = path.basename(pathAfter).toLowerCase();

    match = pubIdMap.get(pubId.toLowerCase()) || baseMap.get(base);
    if (match) {
      if (pubIdMap.has(pubId.toLowerCase())) matchedPubId++;
      else matchedBase++;
    }
  }

  if (match && fs.existsSync(match)) {
    if (!toUpload.has(match)) toUpload.set(match, []);
    toUpload.get(match).push(ref);
  } else {
    unmatched++;
  }
}

console.log('Matched Exact URL:', matchedExactUrl);
console.log('Matched Public ID:', matchedPubId);
console.log('Matched Basename:', matchedBase);
console.log('Total DB refs matched on disk:', toUpload.size, 'distinct local files (for', dbRefs.length - unmatched, 'DB refs)');
console.log('Unmatched refs:', unmatched);

await mongoose.disconnect();
