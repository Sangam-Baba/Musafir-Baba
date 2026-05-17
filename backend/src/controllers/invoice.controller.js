import { Invoice } from "../models/Invoice.js";
import { Counter } from "../models/Counter.js";
import sendEmail from "../services/email.service.js";

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
      invoiceType, clientName, clientEmail, clientPhone, clientAddress, 
      invoiceDate, dueDate, items, subTotal, 
      taxRate, taxAmount, discountAmount, totalAmount, notes,
      customerId, paymentMode, remarks, billingFrom, billingTo,
      packageSummary, passengerDetails, paymentSummary, rentalSummary,
      salesPerson
    } = req.body;

    if (!salesPerson) {
      return res.status(400).json({ success: false, message: "Sales person is required." });
    }

    if (!clientName || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Client name and items are required." });
    }

    const invoiceNumber = await getNextInvoiceNumber();

    const invoice = new Invoice({
      invoiceType: invoiceType || "Package",
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
      notes,
      customerId,
      paymentMode,
      remarks,
      billingFrom,
      billingTo,
      packageSummary,
      passengerDetails,
      paymentSummary,
      rentalSummary,
      salesPerson
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
      .populate("salesPerson")
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
    const invoice = await Invoice.findById(id).populate("salesPerson").lean();

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
    
    // Prevent salesPerson and isApproved from being modified through general update
    if (req.body.salesPerson) {
      delete req.body.salesPerson;
    }
    if (req.body.isApproved !== undefined) {
      delete req.body.isApproved;
    }

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

export const sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { base64Pdf, fileName } = req.body;

    if (!base64Pdf) {
      return res.status(400).json({ success: false, message: "PDF data is required." });
    }

    const invoice = await Invoice.findById(id).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    if (!invoice.isApproved) {
      return res.status(400).json({ success: false, message: "Invoice must be approved before sending." });
    }

    if (!invoice.clientEmail) {
      return res.status(400).json({ success: false, message: "Client email not found for this invoice." });
    }

    const subject = `Travel Invoice ${invoice.invoiceNumber} - MusafirBaba`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
          .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); margin-top: 40px; }
          
          /* Header - Gradient Branded */
          .header { 
            background: linear-gradient(135deg, #FE5300 0%, #ff8c52 100%); 
            padding: 40px 20px; 
            text-align: center; 
            color: #ffffff;
          }
          .logo-container {
            background: #ffffff;
            display: inline-block;
            padding: 12px 25px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .logo { height: 40px; width: auto; display: block; }
          
          /* Content Section */
          .content { padding: 40px; }
          .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 15px; }
          .intro-text { font-size: 16px; color: #475569; margin-bottom: 30px; }
          
          /* Invoice Card */
          .invoice-card { 
            background: #fdf2f2; 
            border: 2px solid #fee2e2; 
            border-radius: 16px; 
            padding: 25px; 
            margin: 25px 0;
            position: relative;
          }
          .invoice-badge {
            position: absolute;
            top: -12px;
            left: 25px;
            background: #FE5300;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 12px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-size: 14px; font-weight: 500; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 700; }
          .total-row { margin-top: 15px; padding-top: 15px; border-top: 2px solid #fecaca; }
          .total-label { font-size: 18px; font-weight: 800; color: #FE5300; }
          .total-value { font-size: 22px; font-weight: 900; color: #FE5300; }
          
          /* Button */
          .cta-section { text-align: center; margin-top: 30px; }
          .btn { 
            display: inline-block; 
            padding: 14px 35px; 
            background: #FE5300; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 12px; 
            font-weight: 700; 
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(254, 83, 0, 0.2);
          }
          
          /* Footer - Dark Theme */
          .footer { 
            background: #0d1b2a; 
            padding: 40px 30px; 
            text-align: center; 
            color: #94a3b8; 
          }
          .footer-logo { height: 25px; opacity: 0.8; margin-bottom: 20px; }
          .footer-text { font-size: 13px; line-height: 1.8; margin-bottom: 20px; }
          .social-links { margin-top: 20px; border-top: 1px solid #1e293b; padding-top: 20px; }
          .contact-info { color: #FE5300; font-weight: 600; text-decoration: none; }
          
          /* Responsive */
          @media screen and (max-width: 600px) {
            .container { margin-top: 0; border-radius: 0; }
            .content { padding: 25px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <img src="https://musafirbaba.com/logo.png" alt="MusafirBaba" class="logo">
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Booking Invoice</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Your travel itinerary is ready!</p>
            </div>
            
            <div class="content">
              <div class="greeting">Hello ${invoice.clientName},</div>
              <p class="intro-text">
                Thank you for booking with <strong>MusafirBaba Travels</strong>. We are thrilled to help you explore the world. 
                Your invoice for booking <strong>${invoice.invoiceNumber}</strong> is attached to this email.
              </p>
              
              <div class="invoice-card">
                <div class="invoice-badge">Summary</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="detail-label" style="padding: 10px 0;">Invoice Number</td>
                    <td class="detail-value" align="right">${invoice.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td class="detail-label" style="padding: 10px 0;">Billing Date</td>
                    <td class="detail-value" align="right">${new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                  <tr>
                    <td class="detail-label" style="padding: 10px 0;">Guest Name</td>
                    <td class="detail-value" align="right">${invoice.clientName}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="total-label" style="padding: 15px 0 0 0;">Grand Total</td>
                    <td class="total-value" align="right" style="padding: 15px 0 0 0;">₹${invoice.totalAmount.toLocaleString("en-IN")}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 14px; color: #64748b; text-align: center;">
                A detailed breakdown of taxes and services is included in the attached PDF document.
              </p>
              
              <div class="cta-section">
                <a href="mailto:care@musafirbaba.com" class="btn">Help & Support</a>
              </div>
            </div>

            <div class="footer">
              <img src="https://musafirbaba.com/logo.png" alt="MusafirBaba" class="footer-logo" style="filter: brightness(0) invert(1);">
              <div class="footer-text">
                <strong>MusafirBaba Travels Pvt Ltd</strong><br>
                1st Floor, Khaira More, Plot no. 2 & 3, Najafgarh, New Delhi - 110043<br>
                Email: <a href="mailto:care@musafirbaba.com" class="contact-info">care@musafirbaba.com</a> | 
                Call: <a href="tel:+919289602447" class="contact-info">+91 92896 02447</a>
              </div>
              <div class="social-links">
                <p style="margin: 0; font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 2px;">
                  Explore. Dream. Discover.
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Resend attachment format (handles base64)
    const attachments = [
      {
        filename: fileName || `${invoice.invoiceNumber}.pdf`,
        content: base64Pdf.includes("base64,") ? base64Pdf.split("base64,")[1] : base64Pdf,
      }
    ];

    const result = await sendEmail(invoice.clientEmail, subject, htmlBody, attachments);

    if (result.success) {
      res.status(200).json({ success: true, message: `Invoice sent to ${invoice.clientEmail} successfully.` });
    } else {
      res.status(500).json({ success: false, message: "Failed to send email.", error: result.error });
    }
  } catch (error) {
    console.error("Sending invoice email failed", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Approve an invoice
export const approveInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    res.status(200).json({ success: true, data: invoice, message: "Invoice approved successfully." });
  } catch (error) {
    console.error("Approving invoice failed", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
