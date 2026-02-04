import { Popup } from "../models/Popup.js";

const createPopup = async (req, res) => {
  try {
    const { button, coverImage } = req.body;
    if (!button || !coverImage) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required things" });
    }
    const popup = new Popup({ button, coverImage, ...req.body });
    await popup.save();

    res
      .status(201)
      .json({ success: true, message: "Successfully created", data: popup });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const getPopups = async (req, res) => {
  try {
    const { page } = req.body;
    if (!page) {
      return res
        .status(400)
        .json({ success: false, message: "Page is required" });
    }
    const popups = await Popup.find({ page: page });
    res
      .status(200)
      .json({ success: true, message: "Popups fetched", data: popups });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const getAllPopups = async (req, res) => {
  try {
    const allpopups = await Popup.find({});
    res
      .status(200)
      .json({ success: true, message: "All popups fetched", data: allpopups });
  } catch (error) {
    req
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const updatePopup = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Popup ID is required" });
    }
    const popup = await Popup.findByIdAndUpdate(id, req.body, { new: true });
    if (!popup) {
      return res
        .status(404)
        .json({ success: false, message: "Popup not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Popup updated", data: popup });
  } catch (error) {
    req
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const deletePopup = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Popup ID is required" });
    }
    const popup = await Popup.findByIdAndDelete(id);
    if (!popup) {
      return res
        .status(404)
        .json({ success: false, message: "Popup not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Popup deleted", data: popup });
  } catch (error) {
    req
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

export { createPopup, getPopups, getAllPopups, updatePopup, deletePopup };
