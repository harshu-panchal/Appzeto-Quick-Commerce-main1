import mongoose from "mongoose";

const rowResultSchema = new mongoose.Schema(
  {
    rowNumber: { type: Number, required: true },
    productName: { type: String, default: "" },
    status: { type: String, enum: ["success", "failed"], required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    errorMessages: [{ type: String }],
    // Original cell values of failed rows, so the error report can be re-filled and re-uploaded.
    rawData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const bulkProductUploadSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    uploadedByRole: { type: String, enum: ["seller", "admin"], required: true },
    fileName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    totalRows: { type: Number, default: 0 },
    processedRows: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    pendingApprovalCount: { type: Number, default: 0 },
    errorMessage: { type: String, default: "" },
    rowResults: [rowResultSchema],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

bulkProductUploadSchema.index({ sellerId: 1, createdAt: -1 });
bulkProductUploadSchema.index({ createdAt: -1 });

export default mongoose.model("BulkProductUpload", bulkProductUploadSchema);
