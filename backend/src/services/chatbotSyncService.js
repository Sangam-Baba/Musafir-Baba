/**
 * Knowledge Base Synchronization Service
 * Fetches data from existing models (Package, Visa, Blog) and normalizes them into the KnowledgeBase collection.
 */

import KnowledgeBase from "../models/KnowledgeBase.js";
import { Package } from "../models/Package.js";
import { Visa } from "../models/Visa.js";
import { Vehicle } from "../models/Vehicle.js";

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
};

export const syncKnowledgeBase = async () => {
  try {
    console.log("Starting Knowledge Base sync...");
    
    // Clear existing to avoid duplicates (in production, use upserts)
    await KnowledgeBase.deleteMany({});

    let syncedCount = 0;

    // 1. Sync Packages
    const packages = await Package.find({ status: "published" });
    for (const pkg of packages) {
      await KnowledgeBase.create({
        title: pkg.title || "Package",
        category: "package",
        keywords: ["holiday", "tour", "package", ...(pkg.keywords || [])],
        content: stripHtml(pkg.description || pkg.packageEssentials || "Holiday package details."),
        url: pkg.canonicalUrl || "",
        priority: 10,
      });
      syncedCount++;
    }

    // 2. Sync Visas
    const visas = await Visa.find({});
    for (const visa of visas) {
      await KnowledgeBase.create({
        title: visa.title || "Visa Application",
        category: "visa",
        keywords: [visa.country || "", "visa", "permit", "application", ...(visa.keywords || [])],
        content: stripHtml(visa.excerpt || visa.quickSummary || visa.content || "Visa application details."),
        url: visa.canonicalUrl || "",
        priority: 10,
      });
      syncedCount++;
    }

    // 3. Sync Rentals (Vehicles)
    const vehicles = await Vehicle.find({ status: "published" });
    for (const vehicle of vehicles) {
      await KnowledgeBase.create({
        title: vehicle.title || vehicle.vehicleName || "Vehicle Rental",
        category: "rental",
        keywords: [vehicle.vehicleBrand || "", vehicle.vehicleType || "", "rental", "rent", "car", "cab", ...(vehicle.features || [])],
        content: stripHtml(vehicle.excerpt || vehicle.vehicleAtAGlance || vehicle.content || "Vehicle rental details."),
        url: vehicle.canonicalUrl || "",
        priority: 10,
      });
      syncedCount++;
    }

    // 4. Static FAQs / Fallbacks
    await KnowledgeBase.create([
      {
        title: "How to contact customer support?",
        category: "contact",
        keywords: ["contact", "support", "help", "email", "phone"],
        content: "You can reach our 24/7 support at support@musafirbaba.com or call +91-1234567890.",
        url: "/contact",
        priority: 5,
      },
      {
        title: "Cancellation Policy",
        category: "policy",
        keywords: ["cancel", "refund", "policy", "money back"],
        content: "Our cancellation policy allows full refund up to 48 hours before travel.",
        url: "/policy/cancellation-policy",
        priority: 5,
      }
    ]);
    syncedCount += 2;

    console.log(`Knowledge Base sync complete. ${syncedCount} records added.`);
    return syncedCount;
  } catch (error) {
    console.error("Error syncing knowledge base:", error);
    throw error;
  }
};
