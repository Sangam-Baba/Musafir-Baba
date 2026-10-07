// Pricing for holiday-package bookings made from the MBGo app.
//
// Pure functions (no DB) so the maths is unit-tested in
// tests/tourAppPricing.service.test.js. Follows what the website's payment
// page actually charges today (frontend app/(user)/payment/[id]/page.tsx):
//   base   = quad × batch.quad + triple × batch.triple
//          + double × batch.double + child × batch.child
//   addOns = Σ add-on price × no. of people  (prices from the package itself)
//   total  = ceil((base + addOns) × 1.05)    (5% GST)
//   partial payment (optional) = ceil(total × 25%),
//   balance due 15 days before departure -- offered for every departure, as
//   on the website. A booking needs at least one traveller of any type
//   (the website only requires a non-zero total).
// Unlike the website, the amounts are computed here on the server rather
// than accepted from the client.

export const GST_RATE = 0.05;
export const ADVANCE_RATE = 0.25;
export const BALANCE_DUE_DAYS_BEFORE_START = 15;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_TYPE = 50;

export const TRAVELLER_TYPES = ["quad", "triple", "double", "child"];

// Returns { travellers } with whole numbers, or { error }.
export function normalizeTravellers(input = {}) {
  const travellers = {};
  for (const type of TRAVELLER_TYPES) {
    const raw = input?.[type] ?? 0;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > MAX_PER_TYPE) {
      return { error: `Invalid number of travellers for ${type}` };
    }
    travellers[type] = n;
  }
  if (travellers.quad + travellers.triple + travellers.double + travellers.child < 1) {
    return { error: "Please select travellers" };
  }
  return { travellers };
}

export function getBalanceDueDate(batchStartDate) {
  const start = new Date(batchStartDate).getTime();
  if (!Number.isFinite(start)) return null;
  return new Date(start - BALANCE_DUE_DAYS_BEFORE_START * DAY_MS);
}

// Resolves requested add-ons ([{ itemId, noOfPeople }]) against the package's
// own add-on list, so prices always come from the package, never the client.
// Returns { addOns } or { error }.
export function resolveAddOns(packageAddOns = [], requested = []) {
  if (!Array.isArray(requested)) return { error: "Invalid add-ons" };
  const catalog = new Map();
  for (const group of packageAddOns || []) {
    for (const item of group?.items || []) {
      if (item?._id) catalog.set(String(item._id), { group: group.title, title: item.title, price: Number(item.price) || 0 });
    }
  }
  const addOns = [];
  for (const req of requested) {
    const item = catalog.get(String(req?.itemId));
    if (!item) return { error: "Selected add-on is not available" };
    const people = Number(req?.noOfPeople);
    if (!Number.isInteger(people) || people < 1 || people > MAX_PER_TYPE) return { error: `Invalid number of people for ${item.title}` };
    addOns.push({ itemId: String(req.itemId), group: item.group, title: item.title, price: item.price, noOfPeople: people, amount: item.price * people });
  }
  return { addOns };
}

/**
 * @param {object} params
 * @param {{ quad?: number, triple?: number, double?: number, child?: number, startDate: string|Date }} params.batch
 * @param {{ quad: number, triple: number, double: number, child: number }} params.travellers  (already normalized)
 * @param {"FULL"|"ADVANCE"} params.paymentOption
 * @returns {{ error?: string, lines?: object[], baseAmount?: number, gstAmount?: number, totalAmount?: number,
 *            payNowAmount?: number, balanceAmount?: number, balanceDueDate?: Date|null }}
 */
export function computeTourBookingPrice({ batch, travellers, addOns = [], paymentOption = "FULL" }) {
  const lines = [];
  let baseAmount = 0;
  for (const type of TRAVELLER_TYPES) {
    const count = travellers[type] || 0;
    if (!count) continue;
    const unitPrice = Number(batch?.[type]);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return { error: `${type} pricing is not available for this departure` };
    }
    lines.push({ type, count, unitPrice, amount: count * unitPrice });
    baseAmount += count * unitPrice;
  }

  const addOnsAmount = addOns.reduce((sum, a) => sum + a.price * a.noOfPeople, 0);
  const totalAmount = Math.ceil((baseAmount + addOnsAmount) * (1 + GST_RATE));
  const gstAmount = totalAmount - baseAmount - addOnsAmount;

  if (paymentOption !== "FULL" && paymentOption !== "ADVANCE") {
    return { error: "Invalid payment option" };
  }

  const payNowAmount = paymentOption === "ADVANCE" ? Math.ceil(totalAmount * ADVANCE_RATE) : totalAmount;
  return {
    lines,
    baseAmount,
    addOnsAmount,
    gstAmount,
    totalAmount,
    payNowAmount,
    balanceAmount: totalAmount - payNowAmount,
    balanceDueDate: paymentOption === "ADVANCE" ? getBalanceDueDate(batch.startDate) : null,
  };
}
