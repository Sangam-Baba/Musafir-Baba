import { VehicleBrand } from "../models/VehicleBrand.js";
import { VehicleType } from "../models/VehicleType.js";
import { VehiclePickUpDestination } from "../models/VehiclePickUpDestination.js";
import { VehicleFuelType } from "../models/VehicleFuelType.js";
import { VehicleTransmission } from "../models/VehicleTransmission.js";

// Helper for generating standard CRUD
const generateCRUD = (Model, modelName) => ({
  create: async (req, res) => {
    try {
      const data = await Model.create(req.body);
      res.status(201).json({ success: true, message: `${modelName} created successfully`, data });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: `${modelName} already exists` });
      }
      res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
  },
  getAll: async (req, res) => {
    try {
      // By default get all active, or all if queried for all
      const query = req.query.all ? {} : { status: "active" };
      const data = await Model.find(query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, message: `Successfully fetched ${modelName}s`, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
  },
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await Model.findById(id);
      if (!data) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.status(200).json({ success: true, message: `Successfully fetched ${modelName}`, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
  },
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await Model.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.status(200).json({ success: true, message: `${modelName} updated successfully`, data });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: `${modelName} already exists` });
      }
      res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
  },
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await Model.findByIdAndDelete(id);
      if (!data) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.status(200).json({ success: true, message: `${modelName} deleted successfully`, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
  }
});

export const brandController = generateCRUD(VehicleBrand, "Brand");
export const typeController = generateCRUD(VehicleType, "Type");
export const destinationController = generateCRUD(VehiclePickUpDestination, "Destination");
export const fuelTypeController = generateCRUD(VehicleFuelType, "Fuel Type");
export const transmissionController = generateCRUD(VehicleTransmission, "Transmission");
