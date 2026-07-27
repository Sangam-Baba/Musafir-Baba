import express from "express";
import multer from "multer";
import {
  createCountry,
  updateCountry,
  deleteCountry,
  getCountries,
  createState,
  updateState,
  deleteState,
  getStates,
  createCity,
  updateCity,
  deleteCity,
  getCities,
  createPincode,
  updatePincode,
  deletePincode,
  getPincodes,
  createLocation,
  updateLocation,
  deleteLocation,
  uploadExcel,
  downloadSampleExcel
} from "../controllers/locationMaster.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js"; 

// Local multer config for excel
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"), false);
    }
  },
});

const router = express.Router();

// -- Upload & Sample
router.post("/locations/upload", isAuthenticated, upload.single("file"), uploadExcel);
router.get("/locations/sample", isAuthenticated, downloadSampleExcel);

// -- Countries
router.post("/countries", isAuthenticated, createCountry);
router.put("/countries/:id", isAuthenticated, updateCountry);
router.delete("/countries/:id", isAuthenticated, deleteCountry);
router.get("/countries", isAuthenticated, getCountries);

// -- States
router.post("/states", isAuthenticated, createState);
router.put("/states/:id", isAuthenticated, updateState);
router.delete("/states/:id", isAuthenticated, deleteState);
router.get("/states", isAuthenticated, getStates);

// -- Cities
router.post("/cities", isAuthenticated, createCity);
router.put("/cities/:id", isAuthenticated, updateCity);
router.delete("/cities/:id", isAuthenticated, deleteCity);
router.get("/cities", isAuthenticated, getCities);

// -- Pincodes
router.post("/pincodes", isAuthenticated, createPincode);
router.put("/pincodes/:id", isAuthenticated, updatePincode);
router.delete("/pincodes/:id", isAuthenticated, deletePincode);
router.get("/pincodes", isAuthenticated, getPincodes);

// -- Locations
router.post("/pincodes/:id/location", isAuthenticated, createLocation);
router.put("/pincodes/:id/location/:locationId", isAuthenticated, updateLocation);
router.delete("/pincodes/:id/location/:locationId", isAuthenticated, deleteLocation);

export default router;
