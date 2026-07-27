import { Country } from "../models/Country.js";
import { State } from "../models/State.js";
import { City } from "../models/City.js";
import { Pincode } from "../models/Pincode.js";
import mongoose from "mongoose";
import * as xlsx from "xlsx";
import { Country as LibraryCountry, State as LibraryState } from "country-state-city";

// --- COUNTRY ---
export const createCountry = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: "Name and code are required" });

    const isExist = await Country.findOne({ code: code.trim(), deletedAt: null });
    if (isExist) return res.status(400).json({ success: false, message: "Country code already exists" });

    const country = new Country({ name: name.trim(), code: code.trim() });
    await country.save();

    res.status(201).json({ success: true, message: "Country created successfully", data: country });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;

    const country = await Country.findById(id);
    if (!country || country.deletedAt) return res.status(404).json({ success: false, message: "Country not found" });

    if (code && code.trim() !== country.code) {
      const isExist = await Country.findOne({ code: code.trim(), deletedAt: null });
      if (isExist) return res.status(400).json({ success: false, message: "Country code already exists" });
      country.code = code.trim();
    }
    if (name) country.name = name.trim();
    if (isActive !== undefined) country.isActive = isActive;

    await country.save();
    res.status(200).json({ success: true, message: "Country updated successfully", data: country });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await Country.findById(id);
    if (!country || country.deletedAt) return res.status(404).json({ success: false, message: "Country not found" });
    if (country.isActive) return res.status(400).json({ success: false, message: "Cannot delete an active country. Please deactivate it first." });

    // Check if active states exist under this country
    const activeStates = await State.findOne({ countryId: id, isActive: true, deletedAt: null });
    if (activeStates) return res.status(400).json({ success: false, message: "Cannot delete country with active states" });

    country.isActive = false;
    country.deletedAt = new Date();
    await country.save();

    res.status(200).json({ success: true, message: "Country deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCountries = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } }
      ];
    }
    
    const limitNum = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNum;

    const countries = await Country.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean();
    const total = await Country.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: countries,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- STATE ---
export const createState = async (req, res) => {
  try {
    const { countryId, name, code } = req.body;
    if (!countryId || !name) return res.status(400).json({ success: false, message: "Country and State name are required" });

    const country = await Country.findOne({ _id: countryId, deletedAt: null });
    if (!country) return res.status(404).json({ success: false, message: "Country not found" });

    const isExist = await State.findOne({ countryId, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, deletedAt: null });
    if (isExist) return res.status(400).json({ success: false, message: "State name already exists in this country" });

    const state = new State({ countryId, name: name.trim(), code: code?.trim() });
    await state.save();

    res.status(201).json({ success: true, message: "State created successfully", data: state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;

    const state = await State.findById(id);
    if (!state || state.deletedAt) return res.status(404).json({ success: false, message: "State not found" });

    if (name && name.trim() !== state.name) {
      const isExist = await State.findOne({ countryId: state.countryId, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, deletedAt: null });
      if (isExist) return res.status(400).json({ success: false, message: "State name already exists in this country" });
      state.name = name.trim();
    }
    if (code !== undefined) state.code = code.trim();
    if (isActive !== undefined) state.isActive = isActive;

    await state.save();
    res.status(200).json({ success: true, message: "State updated successfully", data: state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteState = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await State.findById(id);
    if (!state || state.deletedAt) return res.status(404).json({ success: false, message: "State not found" });
    if (state.isActive) return res.status(400).json({ success: false, message: "Cannot delete an active state. Please deactivate it first." });

    const activeCities = await City.findOne({ stateId: id, isActive: true, deletedAt: null });
    if (activeCities) return res.status(400).json({ success: false, message: "Cannot delete state with active cities" });

    state.isActive = false;
    state.deletedAt = new Date();
    await state.save();

    res.status(200).json({ success: true, message: "State deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStates = async (req, res) => {
  try {
    const { search, countryId, page = 1, limit = 10 } = req.query;
    const filter = { deletedAt: null };
    
    if (countryId) filter.countryId = countryId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } }
      ];
    }
    
    const limitNum = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNum;

    const states = await State.find(filter).populate("countryId", "name code").sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean();
    const total = await State.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: states,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- CITY ---
export const createCity = async (req, res) => {
  try {
    const { stateId, name } = req.body;
    if (!stateId || !name) return res.status(400).json({ success: false, message: "State and City name are required" });

    const state = await State.findOne({ _id: stateId, deletedAt: null });
    if (!state) return res.status(404).json({ success: false, message: "State not found" });

    const isExist = await City.findOne({ stateId, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, deletedAt: null });
    if (isExist) return res.status(400).json({ success: false, message: "City name already exists in this state" });

    const city = new City({ stateId, name: name.trim() });
    await city.save();

    res.status(201).json({ success: true, message: "City created successfully", data: city });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const city = await City.findById(id);
    if (!city || city.deletedAt) return res.status(404).json({ success: false, message: "City not found" });

    if (name && name.trim() !== city.name) {
      const isExist = await City.findOne({ stateId: city.stateId, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, deletedAt: null });
      if (isExist) return res.status(400).json({ success: false, message: "City name already exists in this state" });
      city.name = name.trim();
    }
    if (isActive !== undefined) city.isActive = isActive;

    await city.save();
    res.status(200).json({ success: true, message: "City updated successfully", data: city });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findById(id);
    if (!city || city.deletedAt) return res.status(404).json({ success: false, message: "City not found" });
    if (city.isActive) return res.status(400).json({ success: false, message: "Cannot delete an active city. Please deactivate it first." });

    const activePincodes = await Pincode.findOne({ cityId: id, isActive: true, deletedAt: null });
    if (activePincodes) return res.status(400).json({ success: false, message: "Cannot delete city with active pincodes" });

    city.isActive = false;
    city.deletedAt = new Date();
    await city.save();

    res.status(200).json({ success: true, message: "City deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCities = async (req, res) => {
  try {
    const { search, stateId, page = 1, limit = 10 } = req.query;
    const filter = { deletedAt: null };
    
    if (stateId) filter.stateId = stateId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } }
      ];
    }
    
    const limitNum = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNum;

    const cities = await City.find(filter).populate({ path: "stateId", select: "name code countryId", populate: { path: "countryId", select: "name code" } }).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean();
    const total = await City.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: cities,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- PINCODE ---
export const createPincode = async (req, res) => {
  try {
    const { cityId, pincode } = req.body;
    if (!cityId || !pincode) return res.status(400).json({ success: false, message: "City and Pincode are required" });
    if (!/^\d+$/.test(pincode)) return res.status(400).json({ success: false, message: "Pincode must be numeric" });

    const city = await City.findOne({ _id: cityId, deletedAt: null });
    if (!city) return res.status(404).json({ success: false, message: "City not found" });

    const isExist = await Pincode.findOne({ cityId, pincode: pincode.trim(), deletedAt: null });
    if (isExist) return res.status(400).json({ success: false, message: "Pincode already exists in this city" });

    const pin = new Pincode({ cityId, pincode: pincode.trim() });
    await pin.save();

    res.status(201).json({ success: true, message: "Pincode created successfully", data: pin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePincode = async (req, res) => {
  try {
    const { id } = req.params;
    const { pincode, isActive } = req.body;

    const pin = await Pincode.findById(id);
    if (!pin || pin.deletedAt) return res.status(404).json({ success: false, message: "Pincode not found" });

    if (pincode && pincode.trim() !== pin.pincode) {
       if (!/^\d+$/.test(pincode)) return res.status(400).json({ success: false, message: "Pincode must be numeric" });
       const isExist = await Pincode.findOne({ cityId: pin.cityId, pincode: pincode.trim(), deletedAt: null });
       if (isExist) return res.status(400).json({ success: false, message: "Pincode already exists in this city" });
       pin.pincode = pincode.trim();
    }
    if (isActive !== undefined) pin.isActive = isActive;

    await pin.save();
    res.status(200).json({ success: true, message: "Pincode updated successfully", data: pin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePincode = async (req, res) => {
  try {
    const { id } = req.params;
    const pin = await Pincode.findById(id);
    if (!pin || pin.deletedAt) return res.status(404).json({ success: false, message: "Pincode not found" });
    if (pin.isActive) return res.status(400).json({ success: false, message: "Cannot delete an active PIN code. Please deactivate it first." });

    const hasActiveLocations = pin.locations.some(loc => loc.isActive === true && loc.deletedAt === null);
    if (hasActiveLocations) return res.status(400).json({ success: false, message: "Cannot delete pincode with active locations" });

    pin.isActive = false;
    pin.deletedAt = new Date();
    await pin.save();

    res.status(200).json({ success: true, message: "Pincode deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPincodes = async (req, res) => {
  try {
    const { search, cityId, page = 1, limit = 10 } = req.query;
    const filter = { deletedAt: null };
    
    if (cityId) filter.cityId = cityId;
    if (search) {
      filter.$or = [
        { pincode: { $regex: search, $options: "i" } }
      ];
    }
    
    const limitNum = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNum;

    const pincodes = await Pincode.find(filter).populate({ 
      path: "cityId", 
      select: "name stateId", 
      populate: { path: "stateId", select: "name countryId", populate: { path: "countryId", select: "name" } } 
    }).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean();
    
    // filter out soft-deleted locations in returned data
    pincodes.forEach(p => {
       if(p.locations) {
           p.locations = p.locations.filter(l => !l.deletedAt);
       }
    });

    const total = await Pincode.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: pincodes,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- LOCATION (Embedded in Pincode) ---
export const createLocation = async (req, res) => {
  try {
    const { id } = req.params; // Pincode ID
    const { name } = req.body;
    
    if (!name) return res.status(400).json({ success: false, message: "Location name is required" });

    const pin = await Pincode.findById(id);
    if (!pin || pin.deletedAt) return res.status(404).json({ success: false, message: "Pincode not found" });

    const isExist = pin.locations.find(l => l.name.toLowerCase() === name.trim().toLowerCase() && !l.deletedAt);
    if (isExist) return res.status(400).json({ success: false, message: "Location already exists in this pincode" });

    pin.locations.push({ name: name.trim() });
    await pin.save();

    res.status(201).json({ success: true, message: "Location created successfully", data: pin.locations[pin.locations.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { id, locationId } = req.params;
    const { name, isActive } = req.body;

    const pin = await Pincode.findById(id);
    if (!pin || pin.deletedAt) return res.status(404).json({ success: false, message: "Pincode not found" });

    const location = pin.locations.id(locationId);
    if (!location || location.deletedAt) return res.status(404).json({ success: false, message: "Location not found" });

    if (name && name.trim() !== location.name) {
       const isExist = pin.locations.find(l => l.name.toLowerCase() === name.trim().toLowerCase() && !l.deletedAt && l._id.toString() !== locationId);
       if (isExist) return res.status(400).json({ success: false, message: "Location already exists in this pincode" });
       location.name = name.trim();
    }
    
    if (isActive !== undefined) location.isActive = isActive;

    await pin.save();
    res.status(200).json({ success: true, message: "Location updated successfully", data: location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const { id, locationId } = req.params;

    const pin = await Pincode.findById(id);
    if (!pin || pin.deletedAt) return res.status(404).json({ success: false, message: "Pincode not found" });

    const location = pin.locations.id(locationId);
    if (!location || location.deletedAt) return res.status(404).json({ success: false, message: "Location not found" });
    if (location.isActive) return res.status(400).json({ success: false, message: "Cannot delete an active location. Please deactivate it first." });

    location.isActive = false;
    location.deletedAt = new Date();
    await pin.save();

    res.status(200).json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- EXCEL DOWNLOAD ---
export const downloadSampleExcel = async (req, res) => {
  try {
    const headers = [
      "Country",
      "Country Code (Optional)",
      "State",
      "State Code (Optional)",
      "City",
      "PIN Code",
      "Location"
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([headers]);
    xlsx.utils.book_append_sheet(wb, ws, "Sample");

    const excelBuffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Location_Sample.xlsx"');
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- EXCEL UPLOAD ---
export const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    let data = [];
    for (const sheetName of workbook.SheetNames) {
       const sheet = workbook.Sheets[sheetName];
       const sheetData = xlsx.utils.sheet_to_json(sheet, { defval: "" });
       data = data.concat(sheetData);
    }

    const errors = [];
    let rowIndex = 2; // Data starts at row 2 usually, though spanning multiple sheets makes row numbering a bit fuzzy

    for (const row of data) {
      const countryName = row["Country"]?.trim();
      let countryCode = (row["Country Code"] || row["Country Code (Optional)"])?.toString().trim();
      const stateName = row["State"]?.trim();
      let stateCode = (row["State Code"] || row["State Code (Optional)"])?.toString().trim();
      const cityName = row["City"]?.toString().trim();
      const pincodeVal = row["PIN Code"]?.toString().trim();
      const locationName = row["Location"]?.toString().trim();

      // Skip completely empty rows
      if (!countryName && !stateName && !cityName && !pincodeVal && !locationName) {
        continue;
      }

      if (!countryName) {
        errors.push(`Row ${rowIndex}: Country missing`);
        rowIndex++;
        continue;
      }
      if (!stateName) {
        errors.push(`Row ${rowIndex}: State missing`);
        rowIndex++;
        continue;
      }
      if (!cityName) {
        errors.push(`Row ${rowIndex}: City missing`);
        rowIndex++;
        continue;
      }
      if (!pincodeVal) {
        errors.push(`Row ${rowIndex}: PIN Code missing`);
        rowIndex++;
        continue;
      }
      if (!locationName) {
        errors.push(`Row ${rowIndex}: Location missing`);
        rowIndex++;
        continue;
      }

      // Check / Create Country
      let country = await Country.findOne({ name: { $regex: new RegExp(`^${countryName}$`, 'i') }, deletedAt: null });
      if (!country) {
          if (!countryCode) {
              const foundCountry = LibraryCountry.getAllCountries().find(c => c.name.toLowerCase() === countryName.toLowerCase());
              countryCode = foundCountry ? foundCountry.isoCode : "";
          }
          if (!countryCode) {
              errors.push(`Row ${rowIndex}: Country Code missing for new Country and could not be auto-detected`);
              rowIndex++;
              continue;
          }
          let existingByCode = await Country.findOne({ code: { $regex: new RegExp(`^${countryCode}$`, 'i') }, deletedAt: null });
          if(existingByCode) {
              country = existingByCode; 
          } else {
              country = new Country({ name: countryName, code: countryCode });
              await country.save();
          }
      }

      // Check / Create State
      let state = await State.findOne({ countryId: country._id, name: { $regex: new RegExp(`^${stateName}$`, 'i') }, deletedAt: null });
      if (!state) {
        if (!stateCode && country.code) {
           const foundState = LibraryState.getStatesOfCountry(country.code).find(s => s.name.toLowerCase() === stateName.toLowerCase());
           stateCode = foundState ? foundState.isoCode : "";
        }
        state = new State({ countryId: country._id, name: stateName, code: stateCode || "" });
        await state.save();
      }

      // Check / Create City
      let city = await City.findOne({ stateId: state._id, name: { $regex: new RegExp(`^${cityName}$`, 'i') }, deletedAt: null });
      if (!city) {
        city = new City({ stateId: state._id, name: cityName });
        await city.save();
      }

      // Check / Create Pincode
      let pin = await Pincode.findOne({ cityId: city._id, pincode: pincodeVal, deletedAt: null });
      if (!pin) {
        if (!/^\d+$/.test(pincodeVal)) {
            errors.push(`Row ${rowIndex}: Invalid PIN (must be numeric)`);
            rowIndex++;
            continue;
        }
        pin = new Pincode({ cityId: city._id, pincode: pincodeVal, locations: [] });
        await pin.save();
      }

      // Check / Create Location
      const locExist = pin.locations.find(l => l.name.toLowerCase() === locationName.toLowerCase() && !l.deletedAt);
      if (!locExist) {
        pin.locations.push({ name: locationName });
        await pin.save();
      }

      rowIndex++;
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "File processed with errors",
        errors
      });
    }

    res.status(200).json({
      success: true,
      message: "Data uploaded successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
