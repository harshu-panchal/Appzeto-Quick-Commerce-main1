/**
 * Customer name / phone to show for an order.
 *
 * The populated customer account can be missing (deleted or test accounts) or
 * have no name (phone-OTP signups), which showed up as "Unknown". Every order
 * keeps the name and phone from its delivery address, so fall back to those.
 */
const clean = (value) => String(value ?? "").trim();

export function orderCustomerName(order, fallback = "Customer") {
  return clean(order?.customer?.name) || clean(order?.address?.name) || fallback;
}

export function orderCustomerPhone(order) {
  return clean(order?.customer?.phone) || clean(order?.address?.phone);
}
