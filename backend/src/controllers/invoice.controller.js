import { Invoice } from "../models/Invoice.js";
import { Counter } from "../models/Counter.js";

// Utility to generate the next invoice number
const getNextInvoiceNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "invoiceNumber" },
    { $inc: { count: 1 } },
    { new: true, upsert: true }
  );
  
  // Format to INVMB-00001
  const sequence = String(counter.count).padStart(5, '0');
  return `INVMB-${sequence}`;
};

export const createInvoice = async (req, res) => {
  try {
    const { 
      clientName, clientEmail, clientPhone, clientAddress, 
      invoiceDate, dueDate, items, subTotal, 
      taxRate, taxAmount, discountAmount, totalAmount, notes 
    } = req.body;

    if (!clientName || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Client name and items are required." });
    }

    const invoiceNumber = await getNextInvoiceNumber();

    const invoice = new Invoice({
      invoiceNumber,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      invoiceDate,
      dueDate,
      items,
      subTotal,
      taxRate,
      taxAmount,
      discountAmount,
      totalAmount,
      notes
    });

    await invoice.save();

    res.status(201).json({ success: true, data: invoice, message: "Invoice created successfully." });
  } catch (error) {
    console.error("Invoice creation failed", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const { search } = req.query;
    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(parseInt(req.query.limit || "10"), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { clientName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: invoices,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Fetching invoices failed", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id).lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error("Fetching invoice failed", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    res.status(200).json({ success: true, data: invoice, message: "Invoice updated successfully." });
  } catch (error) {
    console.error("Updating invoice failed", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByIdAndDelete(id);

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    res.status(200).json({ success: true, data: invoice, message: "Invoice deleted successfully." });
  } catch (error) {
    console.error("Deleting invoice failed", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
