export function makeProductSku(name, index = 1) {
  const prefix = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5) || "item";
  return `${prefix}-${String(index).padStart(3, "0")}`;
}

/**
 * Stock is a whole number >= 0, and for products with variants the master
 * `stock` is always the SUM of the variant stocks (computed here, never trusted
 * from the client). Decimals used to be accepted, and after an order decrement
 * left values like 0.00999…, which kept a product "in stock" forever; the
 * master was also copied from the first variant only, so it drifted from the
 * variants that checkout actually checks.
 * Returns an error message, or null when the payload is valid (mutates it).
 */
export function normalizeStockFields(productData) {
  const toWholeStock = (value, label) => {
    if (value === undefined || value === null || String(value).trim() === "") return { value: 0 };
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return { error: `Stock must be a whole number (0 or more)${label ? ` for ${label}` : ""}` };
    }
    return { value: n };
  };

  if (Array.isArray(productData.variants) && productData.variants.length > 0) {
    let total = 0;
    for (const [i, variant] of productData.variants.entries()) {
      const r = toWholeStock(variant?.stock, variant?.name || `variant ${i + 1}`);
      if (r.error) return r.error;
      variant.stock = r.value;
      total += r.value;
    }
    productData.stock = total;
    return null;
  }

  if (productData.stock !== undefined) {
    const r = toWholeStock(productData.stock);
    if (r.error) return r.error;
    productData.stock = r.value;
  }
  return null;
}
