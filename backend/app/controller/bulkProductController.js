import mongoose from "mongoose";
import multer from "multer";
import Seller from "../models/seller.js";
import BulkProductUpload from "../models/bulkProductUpload.js";
import handleResponse from "../utils/helper.js";
import getPagination from "../utils/pagination.js";
import logger from "../services/logger.js";
import {
  buildTemplateWorkbook,
  buildErrorReportWorkbook,
  parseProductsWorkbook,
} from "../services/bulkProduct/productWorkbook.js";
import {
  loadCategoryIndex,
  startBulkImport,
  recordFailedUpload,
  findActiveUploadForSeller,
  markStaleUploads,
} from "../services/bulkProduct/bulkProductImportService.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
}).single("file");

export const receiveBulkFile = (req, res, next) => {
  multerUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return handleResponse(res, 400, "The Excel file must be 5 MB or smaller.");
    if (err.code === "LIMIT_UNEXPECTED_FILE") return handleResponse(res, 400, 'Upload exactly one Excel file in the "file" field.');
    return handleResponse(res, 400, err.message || "File upload failed.");
  });
};

const isAdmin = (req) => String(req.user?.role || "").toLowerCase() === "admin";

async function sendWorkbook(res, workbook, fileName) {
  res.setHeader("Content-Type", XLSX_MIME);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
}

async function findAccessibleUpload(req, projection) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return null;
  const filter = isAdmin(req) ? { _id: id } : { _id: id, sellerId: req.user.id };
  return BulkProductUpload.findOne(filter).select(projection).populate("sellerId", "shopName name email").lean();
}

export const downloadBulkTemplate = async (req, res) => {
  try {
    const { paths } = await loadCategoryIndex();
    const workbook = await buildTemplateWorkbook(paths);
    await sendWorkbook(res, workbook, "bulk-product-upload-template.xlsx");
  } catch (error) {
    logger.error("Bulk template generation failed", { scope: "bulkProduct", error });
    return handleResponse(res, 500, "Could not generate the template");
  }
};

export const uploadBulkProducts = async (req, res) => {
  try {
    const uploadedByRole = isAdmin(req) ? "admin" : "seller";
    const uploadedBy = req.user.id;

    let sellerId = req.user.id;
    if (uploadedByRole === "admin") {
      sellerId = String(req.body?.sellerId || "").trim();
      if (!mongoose.isValidObjectId(sellerId)) return handleResponse(res, 400, "Please select a seller for this upload.");
      if (!(await Seller.exists({ _id: sellerId }))) return handleResponse(res, 404, "Selected seller was not found.");
    }

    const file = req.file;
    if (!file) return handleResponse(res, 400, "Please choose an Excel (.xlsx) file to upload.");
    const fileName = String(file.originalname || "upload.xlsx").slice(0, 200);
    if (!/\.xlsx$/i.test(fileName)) {
      return handleResponse(res, 400, "Only .xlsx Excel files are supported. Please use the downloaded template.");
    }

    if (await findActiveUploadForSeller(sellerId)) {
      return handleResponse(res, 409, "Another bulk upload for this seller is still processing. Please wait for it to finish.");
    }

    let rows;
    try {
      rows = await parseProductsWorkbook(file.buffer);
    } catch (parseError) {
      const upload = await recordFailedUpload({
        sellerId,
        uploadedBy,
        uploadedByRole,
        fileName,
        errorMessage: parseError.message,
      });
      return res.status(400).json({
        success: false,
        error: true,
        message: parseError.message,
        result: { uploadId: upload._id },
      });
    }

    const upload = await startBulkImport({ rows, sellerId, uploadedBy, uploadedByRole, fileName });
    return handleResponse(res, 202, `Processing ${rows.length} product row(s)`, {
      _id: upload._id,
      status: upload.status,
      totalRows: upload.totalRows,
      fileName: upload.fileName,
    });
  } catch (error) {
    logger.error("Bulk product upload failed", { scope: "bulkProduct", error });
    return handleResponse(res, 500, "Bulk upload failed. Please try again.");
  }
};

export const listBulkUploads = async (req, res) => {
  try {
    await markStaleUploads();
    const { page, limit, skip } = getPagination(req, { defaultLimit: 10, maxLimit: 50 });

    const filter = {};
    if (isAdmin(req)) {
      filter.uploadedByRole = "admin";
      if (req.query.sellerId && mongoose.isValidObjectId(req.query.sellerId)) filter.sellerId = req.query.sellerId;
    } else {
      filter.sellerId = req.user.id;
      filter.uploadedByRole = "seller";
    }
    if (["processing", "completed", "failed"].includes(req.query.status)) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      BulkProductUpload.find(filter)
        .select("-rowResults")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sellerId", "shopName name email")
        .lean(),
      BulkProductUpload.countDocuments(filter),
    ]);

    return handleResponse(res, 200, "Bulk uploads fetched", { items, total, page, limit });
  } catch (error) {
    logger.error("Bulk upload history failed", { scope: "bulkProduct", error });
    return handleResponse(res, 500, "Could not load upload history");
  }
};

export const getBulkUpload = async (req, res) => {
  try {
    await markStaleUploads();
    const upload = await findAccessibleUpload(req, "-rowResults.rawData");
    if (!upload) return handleResponse(res, 404, "Upload not found");
    return handleResponse(res, 200, "Bulk upload fetched", upload);
  } catch (error) {
    logger.error("Bulk upload detail failed", { scope: "bulkProduct", error });
    return handleResponse(res, 500, "Could not load this upload");
  }
};

export const downloadBulkErrorReport = async (req, res) => {
  try {
    const upload = await findAccessibleUpload(req, "rowResults fileName status");
    if (!upload) return handleResponse(res, 404, "Upload not found");
    const failedRows = (upload.rowResults || []).filter((r) => r.status === "failed");
    if (failedRows.length === 0) return handleResponse(res, 404, "This upload has no failed rows");

    const workbook = await buildErrorReportWorkbook(failedRows);
    const baseName = String(upload.fileName || "upload").replace(/\.xlsx$/i, "").replace(/[^\w.-]+/g, "_");
    await sendWorkbook(res, workbook, `${baseName}-errors.xlsx`);
  } catch (error) {
    logger.error("Bulk error report failed", { scope: "bulkProduct", error });
    return handleResponse(res, 500, "Could not generate the error report");
  }
};
