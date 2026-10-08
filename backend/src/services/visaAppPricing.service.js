// Visa application pricing + validation for the MBGo rider app.
//
// Pure functions (no DB) -- tested in tests/visaAppPricing.service.test.js.
// Same formula the website's application form charges
// (frontend components/visa/VisaBookingForm.tsx):
//   entry       = chosen visa type's validityEntries[validityIndex], else the visa type itself
//   per person  = govFee + serviceCharge + round(serviceCharge × gst% / 100)
//                 (express fees when express is chosen and the visa type offers it)
//   no visa type chosen / none configured -> per person = visa.cost
//   total       = per person × number of travellers
// The amount is computed here on the server; the client's number is never used.

export const MAX_TRAVELLERS = 20;
export const GENDERS = ["Male", "Female", "Other"];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Documents every traveller must upload -- identical to the website:
// Passport + Photo + the country's own list, de-duplicated.
export function getRequiredDocuments(visa) {
  return Array.from(new Set(["Passport", "Photo", ...((visa && visa.necessaryDocuments) || [])]));
}

// Resolves the chosen visa type / validity. Returns { card, entry, isExpress } or { error }.
export function resolveVisaSelection(visa, { selectedVisaId, selectedValidityIndex, isExpress } = {}) {
  const cards = (visa && visa.visas) || [];
  if (!selectedVisaId) {
    if (cards.length > 0) return { error: "Please choose a visa type" };
    return { card: null, entry: null, isExpress: false };
  }
  const card = cards.find((c) => String(c._id) === String(selectedVisaId));
  if (!card) return { error: "Selected visa type is not available" };

  const entries = card.validityEntries || [];
  let entry = card;
  if (entries.length > 0) {
    const idx = Number(selectedValidityIndex ?? 0);
    if (!Number.isInteger(idx) || idx < 0 || idx >= entries.length) {
      return { error: "Selected validity option is not available" };
    }
    entry = entries[idx];
  }
  // Express only when this visa type offers it (website rule).
  return { card, entry, isExpress: !!(isExpress && card.isExpress) };
}

/**
 * @returns {{ error?: string, perPerson?: { governmentFee, serviceCharge, gstPercent, gst, total },
 *            travellerCount?: number, totalCost?: number, isExpress?: boolean }}
 */
export function computeVisaFee(visa, { selectedVisaId, selectedValidityIndex, isExpress, travellerCount }) {
  const count = Number(travellerCount);
  if (!Number.isInteger(count) || count < 1 || count > MAX_TRAVELLERS) {
    return { error: `Number of travellers must be between 1 and ${MAX_TRAVELLERS}` };
  }
  const sel = resolveVisaSelection(visa, { selectedVisaId, selectedValidityIndex, isExpress });
  if (sel.error) return { error: sel.error };

  let perPerson;
  if (!sel.entry) {
    const cost = num(visa && visa.cost);
    perPerson = { governmentFee: cost, serviceCharge: 0, gstPercent: 0, gst: 0, total: cost };
  } else {
    const e = sel.entry;
    const governmentFee = num(sel.isExpress ? e.expressGovernmentFee : e.governmentFee);
    const serviceCharge = num(sel.isExpress ? e.expressServiceCharges : e.serviceCharges);
    const gstPercent = num(e.gst);
    const gst = Math.round((serviceCharge * gstPercent) / 100);
    perPerson = { governmentFee, serviceCharge, gstPercent, gst, total: governmentFee + serviceCharge + gst };
  }
  if (!(perPerson.total > 0)) return { error: "Fees for this visa option are not available. Please contact support." };

  return { perPerson, travellerCount: count, totalCost: perPerson.total * count, isExpress: sel.isExpress };
}

// Traveller details exactly as the website requires them. Returns { travellers } or { error }.
export function normalizeTravellers(input) {
  if (!Array.isArray(input) || input.length < 1) return { error: "Add at least one traveller" };
  if (input.length > MAX_TRAVELLERS) return { error: `Maximum ${MAX_TRAVELLERS} travellers per application` };
  const travellers = [];
  for (let i = 0; i < input.length; i++) {
    const t = input[i] || {};
    const firstName = String(t.firstName || "").trim();
    const lastName = String(t.lastName || "").trim();
    const dob = String(t.dob || "").trim();
    const gender = String(t.gender || "").trim();
    if (!firstName || !lastName) return { error: `Traveller ${i + 1}: first and last name are required` };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(new Date(dob).getTime()) || new Date(dob) > new Date()) {
      return { error: `Traveller ${i + 1}: enter a valid date of birth` };
    }
    if (!GENDERS.includes(gender)) return { error: `Traveller ${i + 1}: select a gender` };
    travellers.push({ firstName, lastName, dob, gender });
  }
  return { travellers };
}

export function validateContact({ email, phone } = {}) {
  const e = String(email || "").trim();
  const p = String(phone || "").replace(/\D/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { error: "Enter a valid email address" };
  if (p.length < 10) return { error: "Enter a valid phone number" };
  return { email: e, phone: p.slice(-10) };
}

// Documents: [{ name, travellerId: "0" | "1" ..., media: { url, key, format, size } }].
// travellerId is the traveller's position, which is what the admin page matches on.
export function normalizeDocuments(input, travellerCount) {
  if (input === undefined) return { documents: undefined };
  if (!Array.isArray(input)) return { error: "Invalid documents" };
  const documents = [];
  for (const d of input) {
    const name = String(d?.name || "").trim();
    const travellerId = String(d?.travellerId ?? "");
    const idx = Number(travellerId);
    const url = String(d?.media?.url || "");
    if (!name) return { error: "Document name is required" };
    if (!Number.isInteger(idx) || idx < 0 || idx >= travellerCount) return { error: `Invalid traveller for ${name}` };
    if (!/^https:\/\//.test(url)) return { error: `Invalid file for ${name}` };
    documents.push({
      name,
      travellerId: String(idx),
      media: { url, key: String(d.media.key || ""), format: String(d.media.format || ""), size: num(d.media.size) },
    });
  }
  return { documents };
}

// Which required documents are still missing, per traveller position.
export function getMissingDocuments(visa, travellerCount, documents = []) {
  const required = getRequiredDocuments(visa);
  const missing = [];
  for (let i = 0; i < travellerCount; i++) {
    for (const name of required) {
      if (!documents.some((d) => d.travellerId === String(i) && d.name === name && d.media?.url)) {
        missing.push({ traveller: i, name });
      }
    }
  }
  return missing;
}

const PURPOSES = ["Holiday / Tourism", "Visit Family or Friends", "Business Visit", "Study", "Work", "Other"];
// Eligibility answers (guidance only, never blocks). Returns { eligibility } or { error }.
export function normalizeEligibility(input) {
  if (input === undefined || input === null) return { eligibility: undefined };
  const purpose = String(input.purpose || "").trim();
  const travelDate = String(input.travelDate || "").trim();
  const stayDuration = String(input.stayDuration || "").trim();
  const travellerCount = Number(input.travellerCount);
  if (purpose && !PURPOSES.includes(purpose)) return { error: "Invalid travel purpose" };
  if (travelDate && !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) return { error: "Invalid travel date" };
  return {
    eligibility: {
      purpose,
      travelDate,
      stayDuration: stayDuration.slice(0, 40),
      travellerCount: Number.isInteger(travellerCount) && travellerCount > 0 ? Math.min(travellerCount, MAX_TRAVELLERS) : undefined,
    },
  };
}
export const ELIGIBILITY_PURPOSES = PURPOSES;
