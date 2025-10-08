import { Router } from "express";
import {
  getCounter,
  createCounter,
  updateCounter,
} from "../controllers/counter.controller.js";

const counterRoutes = Router();

counterRoutes.get("/:id", getCounter);
counterRoutes.post("/", createCounter);
counterRoutes.patch("/:id", updateCounter);

export default counterRoutes;
