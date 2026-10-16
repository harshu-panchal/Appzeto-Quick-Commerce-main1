import crypto from "node:crypto";
import mongoose from "mongoose";
import Product from "../../models/product.js";
import Category from "../../models/category.js";
import Admin from "../../models/admin.js";
import BulkProductUpload from "../../models/bulkProductUpload.js";
import { slugify } from "../../utils/slugify.js";
import { normalizeStockFields } from "../../utils/productFields.js";
import { uploadToCloudinary } from "../mediaService.js";
import { enqueueProductIndex } from "../searchSyncService.js";
import { buildKey, invalidate } from "../cacheService.js";
import logger from "../logger.js";
import {
  getProductApprovalConfig,
  buildAdminApprovedModerationUpdate,
  buildSellerApprovedModerationUpdate,
  buildSellerPendingModerationUpdate,
} from "../productModerationService.js";
import { emitNotificationEvent } from "../../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../../modules/notifications/notification.constants.js";
import { downloadRemoteImage } from "./remoteImage.js";

const MAX_GALLERY_IMAGES = 5;
const PROGRESS_FLUSH_EVERY = 10;
// An upload still "processing" after this long was interrupted (e.g. server restart).
const STALE_PROCESSING_MS = 30 * 60 * 1000;

const splitList = (value) => {
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(",").map((v) => v.trim());
};

const randomSuffix = (length = 5) => crypto.randomBytes(8).toString("hex").slice(0, length);
const lower = (v) => String(v || "").trim().toLowerCase();

export async function loadCategoryIndex() {
  const all = await Category.find({}).select("_id name type parentId").lean();
  const headers = new Map();
  const categories = new Map();
  const subcategories = new Map();
  const byId = new Map(all.map((c) => [String(c._id), c]));

  for (const c of all) {
    const parent = c.parentId ? String(c.parentId) : "";
    if (c.type === "header") headers.set(lower(c.name), c);
    else if (c.type === "category") categories.set(`${parent}|${lower(c.name)}`, c);
    else if (c.type === "subcategory") subcategories.set(`${parent}|${lower(c.name)}`, c);
  }

  const paths = [];
  for (const sub of all.filter((c) => c.type === "subcategory")) {
    const cat = byId.get(String(sub.parentId));
    const head = cat ? byId.get(String(cat.parentId)) : null;
    if (cat && head) paths.push({ header: head.name, category: cat.name, subcategory: sub.name });
  }
  paths.sort((a, b) =>
    `${a.header}|${a.category}|${a.subcategory}`.localeCompare(`${b.header}|${b.category}|${b.subcategory}`),
  );

  return { headers, categories, subcategories, paths };
}

function parseNumberList(values, label, { required, allowZero, integer }) {
  const errors = [];
  const numbers = values.map((raw, i) => {
    if (raw === "") {
      if (required) errors.push(`${label}: value #${i + 1} is empty`);
      return 0;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || (integer && !Number.isInteger(n))) {
      const rule = integer ? "a whole number (0 or more)" : allowZero ? "a number (0 or more)" : "a number greater than 0";
      errors.push(`${label}: "${raw}" (value #${i + 1}) must be ${rule}`);
      return 0;
    }
    return n;
  });
  return { numbers, errors };
}

/**
 * Validates one sheet row. Returns { errors, product } where product is the
 * Product payload (without seller/moderation/slug/images) when valid.
 */
export function validateRow(data, categoryIndex) {
  const errors = [];
  const name = String(data.name || "").trim();
  if (!name) errors.push("Product Name is required");
  else if (name.length > 200) errors.push("Product Name must be 200 characters or fewer");

  let header = null;
  let category = null;
  let subcategory = null;
  if (!data.headerName) errors.push("Main Group is required");
  if (!data.categoryName) errors.push("Category is required");
  if (!data.subcategoryName) errors.push("Sub-Category is required");
  if (data.headerName) {
    header = categoryIndex.headers.get(lower(data.headerName));
    if (!header) errors.push(`Main Group "${data.headerName}" does not exist`);
  }
  if (header && data.categoryName) {
    category = categoryIndex.categories.get(`${header._id}|${lower(data.categoryName)}`);
    if (!category) errors.push(`Category "${data.categoryName}" does not exist under Main Group "${header.name}"`);
  }
  if (category && data.subcategoryName) {
    subcategory = categoryIndex.subcategories.get(`${category._id}|${lower(data.subcategoryName)}`);
    if (!subcategory) errors.push(`Sub-Category "${data.subcategoryName}" does not exist under Category "${category.name}"`);
  }

  const statusRaw = lower(data.status);
  const statusMap = { "": "active", active: "active", published: "active", inactive: "inactive", draft: "inactive" };
  const status = statusMap[statusRaw];
  if (!status) errors.push(`Status "${data.status}" is invalid — use active or inactive`);

  let lowStockAlert = 5;
  if (String(data.lowStockAlert || "").trim() !== "") {
    const n = Number(data.lowStockAlert);
    if (!Number.isInteger(n) || n < 0) errors.push(`Low Stock Alert "${data.lowStockAlert}" must be a whole number (0 or more)`);
    else lowStockAlert = n;
  }

  let names = splitList(data.variantNames);
  const priceValues = splitList(data.variantPrices);
  const stockValues = splitList(data.variantStocks);
  const saleValues = splitList(data.variantSalePrices);
  const skuValues = splitList(data.variantSkus);

  if (priceValues.length === 0) errors.push("Variant Prices is required");
  if (stockValues.length === 0) errors.push("Variant Stocks is required");
  if (names.length === 0) {
    if (priceValues.length <= 1) names = ["Default"];
    else errors.push("Variant Names is required when there is more than one price");
  }

  const variantCount = names.length;
  if (names.some((n) => !n)) errors.push("Variant Names contains an empty name (check for extra commas)");
  const lowerNames = names.map(lower);
  const duplicateName = lowerNames.find((n, i) => n && lowerNames.indexOf(n) !== i);
  if (duplicateName) errors.push(`Variant name "${duplicateName}" is repeated`);

  const countCheck = (values, label, optional) => {
    if (optional && values.length === 0) return;
    if (values.length > 0 && variantCount > 0 && values.length !== variantCount) {
      errors.push(`${label} has ${values.length} value(s) but Variant Names has ${variantCount}`);
    }
  };
  countCheck(priceValues, "Variant Prices");
  countCheck(stockValues, "Variant Stocks");
  countCheck(saleValues, "Variant Sale Prices", true);
  countCheck(skuValues, "Variant SKUs", true);

  const prices = parseNumberList(priceValues, "Variant Prices", { required: true, allowZero: false });
  const stocks = parseNumberList(stockValues, "Variant Stocks", { required: true, allowZero: true, integer: true });
  const sales = parseNumberList(saleValues, "Variant Sale Prices", { required: false, allowZero: true });
  errors.push(...prices.errors, ...stocks.errors, ...sales.errors);

  const variants = [];
  const listsAligned =
    variantCount > 0 &&
    priceValues.length === variantCount &&
    stockValues.length === variantCount &&
    (saleValues.length === 0 || saleValues.length === variantCount);
  if (listsAligned) {
    for (let i = 0; i < variantCount; i++) {
      const price = prices.numbers[i];
      const salePrice = sales.numbers[i] || 0;
      if (price > 0 && salePrice > 0 && salePrice >= price) {
        errors.push(`Variant "${names[i]}": sale price ${salePrice} must be lower than price ${price}`);
      }
      variants.push({ name: names[i], price, salePrice, stock: stocks.numbers[i], sku: skuValues[i] || "" });
    }
  }

  const mainImageUrl = String(data.mainImageUrl || "").trim();
  const galleryImageUrls = splitList(data.galleryImageUrls).filter(Boolean);
  const isHttpUrl = (u) => /^https?:\/\/\S+$/i.test(u);
  if (mainImageUrl && !isHttpUrl(mainImageUrl)) errors.push("Main Image URL must start with http:// or https://");
  galleryImageUrls.forEach((u, i) => {
    if (!isHttpUrl(u)) errors.push(`Gallery Image URL #${i + 1} must start with http:// or https://`);
  });
  if (galleryImageUrls.length > MAX_GALLERY_IMAGES) errors.push(`At most ${MAX_GALLERY_IMAGES} Gallery Image URLs are allowed`);

  if (errors.length > 0) return { errors, product: null };

  const tags = splitList(data.tags).filter(Boolean);
  const productSku = String(data.sku || "").trim();
  return {
    errors,
    product: {
      name,
      description: String(data.description || "").trim(),
      brand: String(data.brand || "").trim(),
      weight: String(data.weight || "").trim(),
      tags,
      headerId: header._id,
      categoryId: category._id,
      subcategoryId: subcategory._id,
      status,
      lowStockAlert,
      sku: productSku,
      variants,
      price: variants[0].price,
      salePrice: variants[0].salePrice,
      mainImageUrl,
      galleryImageUrls,
    },
  };
}

async function uniqueSlug(name, reserved) {
  const base = slugify(name) || "product";
  let candidate = base;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (!reserved.has(candidate) && !(await Product.exists({ slug: candidate }))) {
      reserved.add(candidate);
      return candidate;
    }
    candidate = `${base}-${randomSuffix()}`;
  }
  throw new Error("Could not generate a unique web address for this product");
}

async function uniqueAutoSku(name, reserved) {
  const prefix = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "item";
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = `${prefix}-${randomSuffix(6)}`;
    if (!reserved.has(candidate) && !(await Product.exists({ sku: candidate }))) {
      reserved.add(candidate);
      return candidate;
    }
  }
  throw new Error("Could not generate a unique SKU for this product");
}

async function uploadImage(url, imageCache) {
  if (imageCache.has(url)) return imageCache.get(url);
  const { buffer, mimeType } = await downloadRemoteImage(url);
  const storedUrl = await uploadToCloudinary(buffer, "products", { mimeType, resourceType: "image" });
  imageCache.set(url, storedUrl);
  return storedUrl;
}

async function createProductFromRow(product, ctx) {
  const errors = [];

  if (product.sku) {
    if (ctx.reservedSkus.has(product.sku)) {
      return { errors: [`Product SKU "${product.sku}" is used by another row in this file`] };
    }
    if (await Product.exists({ sku: product.sku })) {
      return { errors: [`Product SKU "${product.sku}" already exists`] };
    }
    ctx.reservedSkus.add(product.sku);
  }

  let mainImage;
  const galleryImages = [];
  if (product.mainImageUrl) {
    try {
      mainImage = await uploadImage(product.mainImageUrl, ctx.imageCache);
    } catch (err) {
      errors.push(`Main Image URL ${err.message}`);
    }
  }
  for (const [i, url] of product.galleryImageUrls.entries()) {
    try {
      galleryImages.push(await uploadImage(url, ctx.imageCache));
    } catch (err) {
      errors.push(`Gallery Image URL #${i + 1} ${err.message}`);
    }
  }
  if (errors.length > 0) {
    if (product.sku) ctx.reservedSkus.delete(product.sku);
    return { errors };
  }

  const { mainImageUrl, galleryImageUrls, ...fields } = product;
  const productData = {
    ...fields,
    sellerId: ctx.sellerId,
    slug: await uniqueSlug(product.name, ctx.reservedSlugs),
    sku: product.sku || (await uniqueAutoSku(product.name, ctx.reservedSkus)),
    galleryImages,
    ...(mainImage ? { mainImage } : {}),
  };
  if (!productData.mainImage && galleryImages.length > 0) {
    productData.mainImage = galleryImages.shift();
  }
  productData.variants = productData.variants.map((v, idx) => ({
    ...v,
    sku: v.sku || `${productData.sku}-${idx + 1}`,
  }));

  const stockError = normalizeStockFields(productData);
  if (stockError) return { errors: [stockError] };

  Object.assign(productData, ctx.buildModeration());

  try {
    const created = await Product.create(productData);
    return { errors: [], productId: created._id, pending: productData.approvalStatus === "pending" };
  } catch (err) {
    if (err?.code === 11000) return { errors: ["Product SKU or web address already exists"] };
    if (err?.name === "ValidationError") {
      return { errors: Object.values(err.errors).map((e) => e.message) };
    }
    throw err;
  }
}

async function runImport(uploadId, rows, ctx) {
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  const createdIds = [];

  const flushProgress = () =>
    BulkProductUpload.updateOne(
      { _id: uploadId },
      { $set: { processedRows: results.length, successCount, failedCount, pendingApprovalCount: pendingCount } },
    );

  for (const { rowNumber, data } of rows) {
    let outcome;
    try {
      const { errors, product } = validateRow(data, ctx.categoryIndex);
      outcome = errors.length > 0 ? { errors } : await createProductFromRow(product, ctx);
    } catch (err) {
      logger.error("Bulk product row failed", { scope: "bulkProductImport", uploadId: String(uploadId), rowNumber, error: err });
      outcome = { errors: ["Unexpected server error while creating this product"] };
    }

    if (outcome.errors.length === 0) {
      successCount++;
      if (outcome.pending) pendingCount++;
      createdIds.push(outcome.productId);
      results.push({ rowNumber, productName: data.name || "", status: "success", productId: outcome.productId, errorMessages: [] });
    } else {
      failedCount++;
      results.push({ rowNumber, productName: data.name || "", status: "failed", productId: null, errorMessages: outcome.errors, rawData: data });
    }

    if (results.length % PROGRESS_FLUSH_EVERY === 0) await flushProgress();
  }

  await BulkProductUpload.updateOne(
    { _id: uploadId },
    {
      $set: {
        status: "completed",
        processedRows: results.length,
        successCount,
        failedCount,
        pendingApprovalCount: pendingCount,
        rowResults: results,
        completedAt: new Date(),
      },
    },
  );

  for (const id of createdIds) {
    try {
      await enqueueProductIndex(String(id));
    } catch (err) {
      logger.error("Bulk product search indexing failed", { scope: "bulkProductImport", productId: String(id), error: err });
    }
  }
  try {
    await invalidate(buildKey("catalog", "productList", "*"));
    await invalidate("cache:offersections:public:*");
  } catch (err) {
    logger.error("Bulk product cache invalidation failed", { scope: "bulkProductImport", error: err });
  }

  if (pendingCount > 0) {
    try {
      const admins = await Admin.find().select("_id").lean();
      emitNotificationEvent(NOTIFICATION_EVENTS.PRODUCT_MODERATION_REQUEST, {
        productId: createdIds[0],
        productName: `${pendingCount} products (bulk upload)`,
        sellerId: ctx.sellerId,
        adminIds: admins.map((a) => a._id),
        action: "create",
      });
    } catch (err) {
      logger.error("Bulk product moderation notification failed", { scope: "bulkProductImport", error: err });
    }
  }
}

export async function findActiveUploadForSeller(sellerId) {
  return BulkProductUpload.findOne({
    sellerId,
    status: "processing",
    updatedAt: { $gte: new Date(Date.now() - STALE_PROCESSING_MS) },
  })
    .select("_id")
    .lean();
}

export async function markStaleUploads() {
  await BulkProductUpload.updateMany(
    { status: "processing", updatedAt: { $lt: new Date(Date.now() - STALE_PROCESSING_MS) } },
    { $set: { status: "failed", errorMessage: "Processing was interrupted. Please upload the file again.", completedAt: new Date() } },
  );
}

export async function recordFailedUpload({ sellerId, uploadedBy, uploadedByRole, fileName, errorMessage }) {
  return BulkProductUpload.create({
    sellerId,
    uploadedBy,
    uploadedByRole,
    fileName,
    status: "failed",
    errorMessage,
    completedAt: new Date(),
  });
}

/**
 * Creates the history record and processes rows in the background so large
 * sheets (with image downloads) don't hit request timeouts. Callers poll the record.
 */
export async function startBulkImport({ rows, sellerId, uploadedBy, uploadedByRole, fileName }) {
  const categoryIndex = await loadCategoryIndex();

  let buildModeration;
  if (uploadedByRole === "admin") {
    buildModeration = () => buildAdminApprovedModerationUpdate(uploadedBy);
  } else {
    const approvalConfig = await getProductApprovalConfig();
    buildModeration = approvalConfig.sellerCreateRequiresApproval
      ? buildSellerPendingModerationUpdate
      : buildSellerApprovedModerationUpdate;
  }

  const upload = await BulkProductUpload.create({
    sellerId,
    uploadedBy,
    uploadedByRole,
    fileName,
    status: "processing",
    totalRows: rows.length,
  });

  const ctx = {
    sellerId: new mongoose.Types.ObjectId(String(sellerId)),
    uploadedBy,
    uploadedByRole,
    categoryIndex,
    buildModeration,
    reservedSlugs: new Set(),
    reservedSkus: new Set(),
    imageCache: new Map(),
  };

  setImmediate(() => {
    runImport(upload._id, rows, ctx).catch(async (err) => {
      logger.error("Bulk product import crashed", { scope: "bulkProductImport", uploadId: String(upload._id), error: err });
      await BulkProductUpload.updateOne(
        { _id: upload._id },
        { $set: { status: "failed", errorMessage: "The import stopped because of a server error. Please try again.", completedAt: new Date() } },
      ).catch(() => {});
    });
  });

  return upload;
}
