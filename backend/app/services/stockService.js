import Product from "../models/product.js";
import StockHistory from "../models/stockHistory.js";
import { createLowStockAlertCandidate } from "./lowStockAlertService.js";
import { invalidate, buildKey } from "./cacheService.js";

// Audit fix: stock mutations (order placement, cancellation/return) never
// invalidated the product-detail/listing cache, so a sold-out product
// could still show as in-stock (and be added to cart / checked out) for up
// to the 5-minute cache TTL. Both call sites below invalidate every
// touched product's detail cache plus the shared listing cache once per
// call rather than per line-item.
async function invalidateProductStockCache(productIds) {
  const uniqueIds = [...new Set(productIds.map((id) => String(id)).filter(Boolean))];
  if (uniqueIds.length === 0) return;
  await Promise.all(
    uniqueIds.map((id) => invalidate(`cache:catalog:product:${id}`)),
  );
  await invalidate(buildKey("catalog", "productList", "*"));
}

const ONLINE_RESERVATION_MS = () =>
  parseInt(process.env.ONLINE_STOCK_RESERVATION_MS || "900000", 10);

export function computeStockReservationWindow(paymentMode) {
  const now = new Date();
  if (String(paymentMode || "").toUpperCase() !== "ONLINE") {
    return {
      status: "COMMITTED",
      reservedAt: now,
      expiresAt: null,
      releasedAt: null,
    };
  }
  return {
    status: "RESERVED",
    reservedAt: now,
    expiresAt: new Date(now.getTime() + ONLINE_RESERVATION_MS()),
    releasedAt: null,
  };
}

export async function reserveStockForItems({
  items,
  sellerId,
  orderId,
  session,
  paymentMode = "COD",
}) {
  const stockType = String(paymentMode || "").toUpperCase() === "ONLINE" ? "Reservation" : "Sale";
  const lowStockAlerts = [];

  for (const item of items) {
    const variantSku = String(item.variantSku || "").trim();

    let updated;
    if (variantSku) {
      // Decrement variant stock + master stock atomically
      // Use $elemMatch to ensure stock check and sku match on the SAME array element
      updated = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stock: { $gte: item.quantity },
          variants: {
            $elemMatch: {
              sku: variantSku,
              stock: { $gte: item.quantity },
            },
          },
        },
        {
          $inc: {
            stock: -item.quantity,
            "variants.$.stock": -item.quantity,
          },
        },
        { new: true, session },
      );
    } else {
      updated = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        },
        { new: true, session },
      );
    }

    if (!updated) {
      const err = new Error(`Insufficient stock for product: ${item.productName}${variantSku ? ` (variant: ${variantSku})` : ""}`);
      err.statusCode = 409;
      throw err;
    }

    await StockHistory.create(
      [
        {
          product: item.productId,
          seller: sellerId,
          type: stockType,
          quantity: -item.quantity,
          note: `Order #${orderId} ${stockType.toLowerCase()}${variantSku ? ` [variant: ${variantSku}]` : ""}`,
        },
      ],
      { session },
    );

    const previousStock = Number(updated.stock || 0) + Number(item.quantity || 0);
    let previousVariantStock = null;
    let currentVariantStock = null;

    if (variantSku) {
      const matchedVariant = Array.isArray(updated.variants)
        ? updated.variants.find(
          (variant) => String(variant?.sku || "").trim() === variantSku,
        )
        : null;
      if (matchedVariant) {
        currentVariantStock = Number(matchedVariant.stock || 0);
        previousVariantStock = currentVariantStock + Number(item.quantity || 0);
      }
    }

    const alertCandidate = createLowStockAlertCandidate({
      product: updated,
      previousStock,
      currentStock: Number(updated.stock || 0),
      variantSku,
      previousVariantStock,
      currentVariantStock,
    });

    if (alertCandidate) {
      lowStockAlerts.push(alertCandidate);
    }
  }

  await invalidateProductStockCache(items.map((item) => item.productId));

  return lowStockAlerts;
}

export async function releaseReservedStockForOrder(order, { session = null, reason = "Reservation released" } = {}) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return false;
  }

  const reservation = order.stockReservation || {};
  if (reservation.status === "RELEASED") {
    return false;
  }

  for (const item of order.items) {
    const variantSku = String(item.variantSku || item.variantSlot || "").trim();

    if (variantSku) {
      await Product.updateOne(
        { _id: item.product, "variants.sku": variantSku },
        {
          $inc: {
            stock: item.quantity,
            "variants.$.stock": item.quantity,
          },
        },
        session ? { session } : {},
      );
    } else {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
        session ? { session } : {},
      );
    }

    await StockHistory.create(
      [
        {
          product: item.product,
          seller: order.seller,
          type: "Release",
          quantity: item.quantity,
          note: `Order #${order.orderId} ${reason}${variantSku ? ` [variant: ${variantSku}]` : ""}`,
          order: order._id,
        },
      ],
      session ? { session } : {},
    );
  }

  order.stockReservation = {
    ...(order.stockReservation || {}),
    status: "RELEASED",
    releasedAt: new Date(),
  };

  await invalidateProductStockCache(order.items.map((item) => item.product));

  return true;
}
