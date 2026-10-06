import { RidePricingConfig, RIDE_PRICING_CONFIG_KEY } from "../models/RidePricingConfig.js";
import { DEFAULT_RIDE_RATE_CARD } from "../config/defaultRideRateCard.js";
import { calculateRideFare } from "../services/rideFare.service.js";

// Admin read/write for the MBGo rate card. Nothing in the rider-facing ride
// flow reads this config yet; even once it does, it only takes effect while
// `enabled` is true.

const VEHICLE_FIELDS = [
  "name",
  "capacityLabel",
  "seatingCapacity",
  "partnerCategory",
  "oneWayRate",
  "roundTripRate",
  "minKmPerDay",
  "extraKmRate",
  "isActive",
  "sortOrder",
];

function pick(source, fields) {
  const out = {};
  for (const field of fields) {
    if (source?.[field] !== undefined) out[field] = source[field];
  }
  return out;
}

// Whitelists the editable fields from a request body, so unknown keys (and
// `key`, timestamps, etc.) can never be written. Exported for tests.
export function buildConfigUpdate(body = {}) {
  const update = {};

  if (body.enabled !== undefined) update.enabled = body.enabled === true;

  if (body.vehicleTypes !== undefined) {
    if (!Array.isArray(body.vehicleTypes)) throw new Error("vehicleTypes must be a list");
    update.vehicleTypes = body.vehicleTypes.map((vehicle) => ({
      ...(vehicle?._id ? { _id: vehicle._id } : {}),
      ...pick(vehicle, VEHICLE_FIELDS),
    }));
  }

  for (const field of ["driverAllowancePerDay", "taxPercent", "commissionPercent", "payableOnTripNote"]) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  if (body.nightAllowance !== undefined) {
    update.nightAllowance = pick(body.nightAllowance, [
      "amount",
      "startHour",
      "endHour",
      "chargeOneWayIfPickupInWindow",
      "chargeRoundTripPerNight",
    ]);
  }

  if (body.platformCharge !== undefined) {
    update.platformCharge = pick(body.platformCharge, ["type", "value"]);
  }

  return update;
}

// Turning pricing on with nothing to sell would leave riders with zero
// vehicle options, so require at least one active vehicle type.
export function getEnableError(config) {
  if (!config.enabled) return null;
  const hasActive = (config.vehicleTypes || []).some((v) => v.isActive);
  return hasActive ? null : "Add at least one active vehicle type before enabling admin pricing";
}

function newDefaultConfig() {
  return new RidePricingConfig({
    key: RIDE_PRICING_CONFIG_KEY,
    enabled: false,
    vehicleTypes: DEFAULT_RIDE_RATE_CARD,
  });
}

function firstValidationMessage(error) {
  if (error?.name === "ValidationError") {
    const first = Object.values(error.errors)[0];
    return first?.message || error.message;
  }
  return null;
}

// @route   GET /api/admin/ride-pricing
// @desc    Current rate card + settings. If none has been saved yet, returns
//          the default rate card (unsaved, switch OFF) with isSaved: false.
export const getRidePricingConfig = async (req, res) => {
  try {
    const config = await RidePricingConfig.findOne({ key: RIDE_PRICING_CONFIG_KEY }).lean();
    if (config) {
      return res.status(200).json({ success: true, isSaved: true, data: config });
    }
    return res.status(200).json({ success: true, isSaved: false, data: newDefaultConfig().toObject() });
  } catch (error) {
    console.error("Get Ride Pricing Config Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/ride-pricing
// @desc    Create/update the rate card + settings (only whitelisted fields).
export const updateRidePricingConfig = async (req, res) => {
  try {
    let update;
    try {
      update = buildConfigUpdate(req.body);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const config =
      (await RidePricingConfig.findOne({ key: RIDE_PRICING_CONFIG_KEY })) || newDefaultConfig();
    config.set(update);

    const enableError = getEnableError(config);
    if (enableError) {
      return res.status(400).json({ success: false, message: enableError });
    }

    await config.save();
    return res.status(200).json({ success: true, isSaved: true, data: config.toObject() });
  } catch (error) {
    const validationMessage = firstValidationMessage(error);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }
    console.error("Update Ride Pricing Config Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/ride-pricing/preview
// @desc    Fare calculator for the admin page: prices a sample trip for every
//          vehicle type using either the unsaved draft in `config` or the
//          saved config. Read-only -- never writes anything.
// @body    { trip: { tripType, routeKm, rideDate, rideTime, returnDate }, config? }
export const previewRideFare = async (req, res) => {
  try {
    const { trip = {}, config: draft } = req.body || {};

    let config;
    if (draft) {
      let update;
      try {
        update = buildConfigUpdate(draft);
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
      const draftDoc = newDefaultConfig();
      draftDoc.set(update);
      const validationError = draftDoc.validateSync();
      if (validationError) {
        return res.status(400).json({ success: false, message: firstValidationMessage(validationError) });
      }
      config = draftDoc.toObject();
    } else {
      config =
        (await RidePricingConfig.findOne({ key: RIDE_PRICING_CONFIG_KEY }).lean()) ||
        newDefaultConfig().toObject();
    }

    const fares = config.vehicleTypes.map((vehicle) => ({
      name: vehicle.name,
      partnerCategory: vehicle.partnerCategory,
      isActive: vehicle.isActive,
      ...calculateRideFare({ rate: vehicle, settings: config, trip }),
    }));

    return res.status(200).json({ success: true, data: fares });
  } catch (error) {
    // calculateRideFare throws for bad trip input (e.g. return before ride date)
    return res.status(400).json({ success: false, message: error.message || "Could not preview fare" });
  }
};
