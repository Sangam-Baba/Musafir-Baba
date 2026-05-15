import { SalesPerson } from "../models/SalesPerson.js";

export const createSalesPerson = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    const person = new SalesPerson({ name });
    await person.save();
    res.status(201).json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesPersons = async (req, res) => {
  try {
    const persons = await SalesPerson.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: persons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesPersonById = async (req, res) => {
  try {
    const person = await SalesPerson.findById(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: "Sales person not found" });
    }
    res.status(200).json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSalesPerson = async (req, res) => {
  try {
    const person = await SalesPerson.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!person) {
      return res.status(404).json({ success: false, message: "Sales person not found" });
    }
    res.status(200).json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSalesPerson = async (req, res) => {
  try {
    const person = await SalesPerson.findByIdAndDelete(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: "Sales person not found" });
    }
    res.status(200).json({ success: true, message: "Sales person deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
