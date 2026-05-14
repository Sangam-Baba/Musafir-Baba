import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceType: {
      type: String,
      enum: ["Package", "Rental"],
      default: "Package",
    },
    invoiceNumber: {
      type: String,
      unique: true,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    clientEmail: {
      type: String,
    },
    clientPhone: {
      type: String,
    },
    clientAddress: {
      type: String,
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    customerId: String,
    paymentMode: String,
    remarks: String,
    billingFrom: {
      gstnNo: { type: String, default: "07AAQCM4510N1Z2" },
      address: { type: String, default: "1st Floor, Khaira More, Plot no. 2 & 3, Near Dhansa Metro Station, Najafgarh, ND - 110043" },
      contactNo: { type: String, default: "92896 02447, 92205 02447" },
      emailId: { type: String, default: "info@musafirbaba.com" },
      website: { type: String, default: "www.musafirbaba.com" },
    },
    billingTo: {
      bedSharing: String,
      emergencyContact: String,
    },
    packageSummary: {
      particulars: String,
      duration: String,
      startDate: Date,
      endDate: Date,
      packagePrice: Number,
    },
    rentalSummary: {
      vehicleName: String,
      checkIn: Date,
      checkOut: Date,
      numberOfVehicles: Number,
    },
    passengerDetails: [
      {
        sNo: Number,
        name: String,
        aadharNo: String,
        age: String,
        address: String,
        medical: String,
      },
    ],
    paymentSummary: {
      paymentId: String,
      advanceReceived: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      balanceAmount: { type: Number, default: 0 },
    },
    items: [invoiceItemSchema],
    subTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0, // Percentage
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);
