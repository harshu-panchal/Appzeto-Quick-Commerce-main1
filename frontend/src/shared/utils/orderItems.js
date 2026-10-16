/**
 * Display helpers for order line items.
 *
 * Items store the chosen variant as `variantSlot` (the variant's SKU, or its
 * name on older orders). The seller order list populates `item.product` with
 * the product's variants, so the SKU can be turned back into "500 g" etc.
 */
const clean = (value) => String(value ?? "").trim();

export function orderItemVariant(item) {
  const slot = clean(item?.variantSlot || item?.variantSku || item?.variantName);
  if (!slot) return "";
  const variants = Array.isArray(item?.product?.variants) ? item.product.variants : [];
  const match = variants.find((v) => clean(v?.sku) === slot || clean(v?.name) === slot);
  if (match?.name) return clean(match.name);
  // an unknown SKU code is not useful to show; a plain name is
  return /^[A-Z0-9_-]+-v\d+$/i.test(slot) ? "" : slot;
}

export function orderItemImage(item) {
  return clean(item?.image) || clean(item?.product?.mainImage) || "";
}
