import { Invoice } from "@/app/admin/invoices/page";
import { jsPDF } from "jspdf";

export const generateInvoicePDF = (invoice: Invoice, action: "view" | "download" | "dataurl" | "base64" = "download"): string | undefined => {
  const doc = new jsPDF({
    compress: true,
  });
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let yPos = 10;

  const primaryColor = [254, 189, 0]; // Yellow
  const secondaryColor = [13, 27, 42]; // Dark Navy
  const textColor = [40, 40, 40];
  const borderColor = [200, 200, 200];

  // --- HEADER IMAGE ---
  const drawHeader = () => {
    try {
      // Use the combined header image provided by the user
      doc.addImage("/invoice_pdf_header.jpg", "JPEG", 0, 0, pageWidth, 50, undefined, "FAST");
    } catch (e) {
      console.error("Header image error:", e);
    }
  };

  const drawFooter = () => {
    const footerH = 20;
    const footerY = pageHeight - footerH;
    
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, footerY, pageWidth, footerH, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    
    const drawFooterIconText = (type: "phone" | "gst" | "email" | "web", text: string, x: number, y: number) => {
      // Draw custom vector icon based on type
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.4);

      if (type === "phone") {
        // Mobile phone icon
        doc.rect(x - 1.1, y - 2.8, 2.2, 3.4, "S");
        doc.circle(x, y - 0.6, 0.25, "F"); // home button
        doc.line(x - 0.4, y - 2.4, x + 0.4, y - 2.4); // speaker
      } else if (type === "gst") {
        // Document/GST icon
        doc.rect(x - 1.2, y - 2.8, 2.4, 3.4, "S");
        doc.line(x - 0.7, y - 2.0, x + 0.7, y - 2.0);
        doc.line(x - 0.7, y - 1.3, x + 0.7, y - 1.3);
        doc.line(x - 0.7, y - 0.6, x + 0.2, y - 0.6);
      } else if (type === "email") {
        // Envelope icon
        doc.rect(x - 1.5, y - 2.3, 3, 2.2, "S");
        doc.line(x - 1.5, y - 2.3, x, y - 1.2);
        doc.line(x + 1.5, y - 2.3, x, y - 1.2);
      } else if (type === "web") {
        // Globe icon
        doc.circle(x, y - 1.2, 1.7, "S");
        doc.line(x - 1.7, y - 1.2, x + 1.7, y - 1.2); // equator
        doc.line(x, y - 2.9, x, y + 0.5); // prime meridian
      }

      doc.setTextColor(255, 255, 255);
      doc.text(text, x + 4, y);
    };

    drawFooterIconText("phone", "+91 92896 02447", 15, footerY + 8);
    drawFooterIconText("gst", "07CEKPR2608F2ZF", 15, footerY + 14);

    drawFooterIconText("email", "care@musafirbaba.com", pageWidth / 2 - 20, footerY + 8);
    drawFooterIconText("web", "www.musafirbaba.com", pageWidth / 2 - 20, footerY + 14);

    // Location/Map marker icon on the right
    const locX = pageWidth - 65;
    const locY = footerY + 8;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.4);
    
    // Pin head circle
    doc.circle(locX, locY - 1.8, 1.3, "S");
    // Inside dot
    doc.circle(locX, locY - 1.8, 0.45, "F");
    // Pointy bottom
    doc.line(locX - 1.0, locY - 1.2, locX, locY + 0.5);
    doc.line(locX + 1.0, locY - 1.2, locX, locY + 0.5);
    
    doc.setTextColor(255, 255, 255);
    const addressText = invoice.billingFrom?.address || "1st Floor, Khaira More, Najafgarh, ND - 110043";
    const addressLines = doc.splitTextToSize(addressText, 60);
    doc.text(addressLines, pageWidth - 60, footerY + 8);
  };

  // Draw header for page 1
  drawHeader();
  
  yPos = 55;

  // --- TITLE BADGE ---
  // doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  // const title = "PAYMENT ACKNOWLEDGEMENT"; // Or "INVOICE"
  // doc.setFont("helvetica", "bold");
  // doc.setFontSize(12);
  // const titleW = doc.getTextWidth(title) + 20;
  // doc.rect((pageWidth - titleW) / 2, yPos, titleW, 10, "F");
  
  // // Diamonds on the sides to simulate the badge shape
  // doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  // const diamondSize = 2;
  // const drawDiamond = (cx: number, cy: number) => {
  //   doc.lines([[diamondSize, diamondSize], [-diamondSize, diamondSize], [-diamondSize, -diamondSize], [diamondSize, -diamondSize]], cx, cy - diamondSize, [1, 1], "F");
  // };
  // drawDiamond((pageWidth - titleW) / 2 - 8, yPos + 5);
  // drawDiamond((pageWidth + titleW) / 2 + 8, yPos + 5);

  // doc.setTextColor(255, 255, 255);
  // // doc.text(title, pageWidth / 2, yPos + 6.5, { align: "center" });
  // yPos += 18;

  // --- INFO BOX ---
  const rightX = pageWidth / 2 + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const remarksText = invoice.remarks || "N/A";
  const maxRemarksWidth = pageWidth - margin - (rightX + 50) - 2;
  const wrappedRemarks = doc.splitTextToSize(remarksText, maxRemarksWidth);
  const extraLines = Math.max(0, wrappedRemarks.length - 1);
  const extraHeight = extraLines * 3.5;
  const boxHeight = 24 + extraHeight;

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "S");
  
  doc.setTextColor(textColor[0]);

  const drawIcon = (x: number, y: number) => {
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.circle(x, y - 1, 1.8, "F");
  };

  // Left Col
  let infoY = yPos + 6;
  drawIcon(margin + 6, infoY);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE NO.", margin + 12, infoY);
  doc.text(":", margin + 40, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceNumber || "N/A", margin + 45, infoY);

  infoY += 7;
  drawIcon(margin + 6, infoY);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE DATE", margin + 12, infoY);
  doc.text(":", margin + 40, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "N/A", margin + 45, infoY);

  infoY += 7;
  drawIcon(margin + 6, infoY);
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER ID", margin + 12, infoY);
  doc.text(":", margin + 40, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.customerId || "N/A", margin + 45, infoY);

  // Right Col
  infoY = yPos + 6;
  drawIcon(rightX + 6, infoY);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT MODE", rightX + 12, infoY);
  doc.text(":", rightX + 45, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.paymentMode || "N/A", rightX + 50, infoY);

  infoY += 7;
  drawIcon(rightX + 6, infoY);
  doc.setFont("helvetica", "bold");
  doc.text("AMOUNT RECEIVED", rightX + 12, infoY);
  doc.text(":", rightX + 45, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(`Rs. ${invoice.paymentSummary?.advanceReceived || 0}/-`, rightX + 50, infoY);

  infoY += 7;
  drawIcon(rightX + 6, infoY);
  doc.setFont("helvetica", "bold");
  doc.text("REMARKS", rightX + 12, infoY);
  doc.text(":", rightX + 45, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(wrappedRemarks, rightX + 50, infoY);

  yPos += 30 + extraHeight;

  // --- BILLING FROM / TO ---
  doc.setFontSize(7.5);
  const fromAddr = doc.splitTextToSize(invoice.billingFrom?.address || "1st Floor, Khaira More, Najafgarh, ND - 110043", contentWidth / 2 - 40);
  const toAddr = doc.splitTextToSize(invoice.clientAddress || "N/A", contentWidth / 2 - 45);
  const addressHeight = Math.max(fromAddr.length * 3.5, toAddr.length * 3.5, 10);
  
  const billingH = 42 + addressHeight; // Dynamic height based on address lines

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, yPos, contentWidth, billingH, 3, 3, "S");
  
  // Header bar
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.roundedRect(margin, yPos, contentWidth, 8, 3, 3, "F");
  doc.rect(margin, yPos + 5, contentWidth, 3, "F"); // make bottom corners square

  // Dividers
  doc.setDrawColor(255, 255, 255);
  doc.line(pageWidth / 2, yPos, pageWidth / 2, yPos + 8);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(pageWidth / 2, yPos + 8, pageWidth / 2, yPos + billingH);

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.circle(margin + 6, yPos + 4, 1.5, "F");
  doc.text("BILLING FROM", margin + 10, yPos + 5.5);
  
  doc.circle(pageWidth / 2 + 6, yPos + 4, 1.5, "F");
  doc.text("BILLING TO", pageWidth / 2 + 10, yPos + 5.5);

  // Content
  doc.setTextColor(textColor[0]);
  let bY = yPos + 14;
  
  // From Name
  doc.setFontSize(9);
  doc.text("Musafirbaba Travels Pvt Ltd", margin + 6, bY);
  bY += 6;

  doc.setFontSize(7.5);
  // Address From
  drawIcon(margin + 6, bY);
  doc.setFont("helvetica", "bold");
  doc.text("ADDRESS", margin + 10, bY);
  doc.text(":", margin + 30, bY);
  doc.setFont("helvetica", "normal");
  doc.text(fromAddr, margin + 35, bY);

  // Address To
  drawIcon(pageWidth / 2 + 6, yPos + 14);
  doc.setFont("helvetica", "bold");
  doc.text("ADDRESS", pageWidth / 2 + 10, yPos + 14);
  doc.text(":", pageWidth / 2 + 35, yPos + 14);
  doc.setFont("helvetica", "normal");
  doc.text(toAddr, pageWidth / 2 + 40, yPos + 14);

  bY += Math.max(fromAddr.length * 3.5, toAddr.length * 3.5, 10);

  // Additional Fields From
  drawIcon(margin + 6, bY);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACT NO.", margin + 10, bY);
  doc.text(":", margin + 30, bY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.billingFrom?.contactNo || "92896 02447", margin + 35, bY);

  // Additional Fields To
  drawIcon(pageWidth / 2 + 6, bY);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACT NO.", pageWidth / 2 + 10, bY);
  doc.text(":", pageWidth / 2 + 35, bY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.clientPhone || "N/A", pageWidth / 2 + 40, bY);

  bY += 6;
  drawIcon(margin + 6, bY);
  doc.setFont("helvetica", "bold");
  doc.text("EMAIL ID", margin + 10, bY);
  doc.text(":", margin + 30, bY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.billingFrom?.emailId || "info@musafirbaba.com", margin + 35, bY);

  drawIcon(pageWidth / 2 + 6, bY);
  doc.setFont("helvetica", "bold");
  doc.text("EMAIL ID", pageWidth / 2 + 10, bY);
  doc.text(":", pageWidth / 2 + 35, bY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.clientEmail || "N/A", pageWidth / 2 + 40, bY);

  bY += 6;
  drawIcon(margin + 6, bY);
  doc.setFont("helvetica", "bold");
  doc.text("WEBSITE", margin + 10, bY);
  doc.text(":", margin + 30, bY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.billingFrom?.website || "www.musafirbaba.com", margin + 35, bY);

  drawIcon(pageWidth / 2 + 6, bY);
  doc.setFont("helvetica", "bold");
  doc.text("EMERGENCY", pageWidth / 2 + 10, bY);
  doc.text(":", pageWidth / 2 + 35, bY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.billingTo?.emergencyContact || "N/A", pageWidth / 2 + 40, bY);

  bY += 6;
  drawIcon(margin + 6, bY);
  doc.setFont("helvetica", "bold");
  doc.text("GSTN NO.", margin + 10, bY);
  doc.text(":", margin + 30, bY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.billingFrom?.gstnNo || "07AAQCM4510N1Z2", margin + 35, bY);

  yPos += billingH + 4;

  // --- HELPERS FOR TABLES ---
  const drawPillTitle = (title: string, y: number) => {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const tw = doc.getTextWidth(title) + 20;
    doc.roundedRect((pageWidth - tw) / 2, y, tw, 6, 3, 3, "F");
    
    // Add side arrows/triangles to the pill
    doc.triangle((pageWidth - tw) / 2, y, (pageWidth - tw) / 2 - 4, y + 3, (pageWidth - tw) / 2, y + 6, "F");
    doc.triangle((pageWidth + tw) / 2, y, (pageWidth + tw) / 2 + 4, y + 3, (pageWidth + tw) / 2, y + 6, "F");

    doc.setTextColor(0);
    doc.text(title, pageWidth / 2, y + 4.2, { align: "center" });
    return y + 6;
  };

  const drawTableHeader = (cols: {name: string, width: number, sub?: string[]}[], y: number) => {
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    
    let curX = margin;
    cols.forEach(col => {
      if (col.sub) {
        doc.text(col.name, curX + col.width / 2, y + 3.5, { align: "center" });
        doc.setDrawColor(255, 255, 255);
        doc.line(curX, y + 4, curX + col.width, y + 4); // Horizontal line for sub
        doc.text(col.sub[0], curX + col.width / 4, y + 7, { align: "center" });
        doc.line(curX + col.width / 2, y + 4, curX + col.width / 2, y + 8); // Vertical line
        doc.text(col.sub[1], curX + (3 * col.width) / 4, y + 7, { align: "center" });
      } else {
        doc.text(col.name, curX + col.width / 2, y + 5, { align: "center" });
      }
      
      // Vertical dividers
      doc.setDrawColor(255, 255, 255);
      if (curX > margin) doc.line(curX, y, curX, y + 8);
      
      curX += col.width;
    });
    return y + 8;
  };

  // --- PACKAGE SUMMARY & PASSENGER DETAILS (Package invoices only) ---
  if (!invoice.invoiceType || invoice.invoiceType === "Package") {
    yPos = drawPillTitle("PACKAGE SUMMARY", yPos);
    
    const pkgW = [50, 25, 45, 45, 25];
    const pkgCols = [
      { name: "PARTICULARS", width: pkgW[0] },
      { name: "DURATION", width: pkgW[1] },
      { name: "TRIP START DATE / CHECK-IN DATE", width: pkgW[2] },
      { name: "TRIP END DATE / CHECK-OUT DATE", width: pkgW[3] },
      { name: "PACKAGE", width: pkgW[4] }
    ];

    yPos = drawTableHeader(pkgCols, yPos);
    
    doc.setTextColor(textColor[0]);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    
    // Data Row
    doc.rect(margin, yPos, contentWidth, 8, "S");
    let cX = margin;
    const pkgData = [
      invoice.packageSummary?.particulars || "N/A",
      invoice.packageSummary?.duration || "N/A",
      invoice.packageSummary?.startDate ? new Date(invoice.packageSummary.startDate).toLocaleDateString("en-IN") : "N/A",
      invoice.packageSummary?.endDate ? new Date(invoice.packageSummary.endDate).toLocaleDateString("en-IN") : "N/A",
      `Rs. ${invoice.totalAmount || 0}`
    ];

    pkgCols.forEach((col, i) => {
      if (cX > margin) doc.line(cX, yPos, cX, yPos + 8);
      doc.text(pkgData[i], cX + col.width / 2, yPos + 5, { align: "center" });
      cX += col.width;
    });
    yPos += 10;

    // --- PASSENGER DETAILS ---
    yPos = drawPillTitle("PASSENGER DETAILS", yPos);
    const passW = [15, 50, 30, 15, 60, 20];
    const passCols = [
      { name: "S. NO.", width: passW[0] },
      { name: "NAME / NO. OF PAX", width: passW[1] },
      { name: "AADHAR NO.", width: passW[2] },
      { name: "AGE", width: passW[3] },
      { name: "ADDRESS", width: passW[4] },
      { name: "MEDICAL", width: passW[5] }
    ];

    yPos = drawTableHeader(passCols, yPos);
    
    doc.setTextColor(textColor[0]);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);

    if (invoice.passengerDetails && invoice.passengerDetails.length > 0) {
      invoice.passengerDetails.forEach(p => {
        const addressLines = doc.splitTextToSize(p.address || "N/A", passCols[4].width - 4);
        const rowHeight = Math.max(8, addressLines.length * 3.5 + 4);

        doc.rect(margin, yPos, contentWidth, rowHeight, "S");
        let curX = margin;
        
        const pData: any[] = [
          p.sNo?.toString() || "N/A", 
          p.name || "N/A", 
          p.aadharNo || "N/A", 
          p.age?.toString() || "N/A", 
          addressLines, 
          p.medical || "N/A"
        ];

        passCols.forEach((col, i) => {
          if (curX > margin) doc.line(curX, yPos, curX, yPos + rowHeight);
          doc.text(pData[i], curX + col.width / 2, yPos + 5, { align: "center" });
          curX += col.width;
        });
        yPos += rowHeight;
      });
    } else {
        doc.rect(margin, yPos, contentWidth, 8, "S");
        let curX = margin;
        passCols.forEach((col, i) => {
          if (curX > margin) doc.line(curX, yPos, curX, yPos + 8);
          curX += col.width;
        });
        yPos += 8;
    }
    yPos += 2;
  }

  // --- RENTAL SUMMARY (Rental invoices only) ---
  if (invoice.invoiceType === "Rental") {
    yPos = drawPillTitle("RENTAL SUMMARY", yPos);

    const rentalW = [55, 45, 45, 45];
    const rentalCols = [
      { name: "VEHICLE NAME", width: rentalW[0] },
      { name: "CHECK-IN DATE", width: rentalW[1] },
      { name: "CHECK-OUT DATE", width: rentalW[2] },
      { name: "NO. OF VEHICLES", width: rentalW[3] }
    ];

    yPos = drawTableHeader(rentalCols, yPos);

    doc.setTextColor(textColor[0]);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);

    doc.rect(margin, yPos, contentWidth, 8, "S");
    let rX = margin;
    const rentalData = [
      invoice.rentalSummary?.vehicleName || "N/A",
      invoice.rentalSummary?.checkIn ? new Date(invoice.rentalSummary.checkIn).toLocaleDateString("en-IN") : "N/A",
      invoice.rentalSummary?.checkOut ? new Date(invoice.rentalSummary.checkOut).toLocaleDateString("en-IN") : "N/A",
      String(invoice.rentalSummary?.numberOfVehicles || "N/A")
    ];

    rentalCols.forEach((col, i) => {
      if (rX > margin) doc.line(rX, yPos, rX, yPos + 8);
      doc.text(rentalData[i], rX + col.width / 2, yPos + 5, { align: "center" });
      rX += col.width;
    });
    yPos += 10;
  }



  // --- PAYMENT SUMMARY ---
  yPos = drawPillTitle("PAYMENT SUMMARY", yPos);
  const payW = [40, 40, 40, 40, 30];
  const payCols = [
    { name: "PAYMENT ID", width: payW[0] },
    { name: "ADVANCE RECEIVED", width: payW[1] },
    { name: "TAXES", width: payW[2], sub: ["CGST", "SGST"] },
    { name: "BALANCE AMOUNT", width: payW[3] },
    { name: "TOTAL", width: payW[4] }
  ];

  yPos = drawTableHeader(payCols, yPos);
  
  doc.setTextColor(textColor[0]);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);

  doc.rect(margin, yPos, contentWidth, 8, "S");
  let px = margin;

  const cgst = invoice.paymentSummary?.cgst || 0;
  const sgst = invoice.paymentSummary?.sgst || 0;
  const advance = invoice.paymentSummary?.advanceReceived || 0;
  const finalTotal = (invoice.totalAmount || 0) + cgst + sgst;
  const balance = Math.max(0, finalTotal - advance);

  const balanceDisplay = balance === 0 ? "Nil" : `Rs. ${balance}`;
  const totalDisplay = `Rs. ${finalTotal}`;

  const payData = [
    invoice.paymentSummary?.paymentId || "N/A",
    `Rs. ${advance}`,
    `${cgst}`,
    `${sgst}`,
    balanceDisplay,
    totalDisplay
  ];

  let pdIdx = 0;
  payCols.forEach(col => {
    if (px > margin) doc.line(px, yPos, px, yPos + 8);
    if (col.sub) {
      doc.text(payData[pdIdx++], px + col.width / 4, yPos + 5, { align: "center" });
      doc.line(px + col.width / 2, yPos, px + col.width / 2, yPos + 8);
      doc.text(payData[pdIdx++], px + (3 * col.width) / 4, yPos + 5, { align: "center" });
    } else {
      doc.text(payData[pdIdx++], px + col.width / 2, yPos + 5, { align: "center" });
    }
    px += col.width;
  });
  yPos += 8;

  // TOTAL Row
  doc.setFillColor(255, 245, 220); // Light yellow for Total row background
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.rect(margin, yPos, contentWidth, 8, "S");
  doc.setFont("helvetica", "bold");
  
  px = margin;
  doc.text("TOTAL", px + payW[0] / 2, yPos + 5, { align: "center" });
  px += payW[0];
  
  doc.line(px, yPos, px, yPos + 8);
  doc.text(`Rs. ${advance}`, px + payW[1] / 2, yPos + 5, { align: "center" });
  px += payW[1];

  doc.line(px, yPos, px, yPos + 8);
  doc.text(`${cgst + sgst}`, px + payW[2] / 2, yPos + 5, { align: "center" });
  px += payW[2];

  doc.line(px, yPos, px, yPos + 8);
  doc.text(balanceDisplay, px + payW[3] / 2, yPos + 5, { align: "center" });
  px += payW[3];

  doc.line(px, yPos, px, yPos + 8);
  doc.text(totalDisplay, px + payW[4] / 2, yPos + 5, { align: "center" });

  yPos += 14;

  // Draw footer for page 1 before moving to new page
  drawFooter();

  // Add new page for terms
  doc.addPage();
  drawHeader();
  yPos = 55;

  // --- TERMS & CONDITIONS (PAGE 2) ---
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.roundedRect(margin, yPos, 50, 6, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.circle(margin + 5, yPos + 3, 1.5, "F"); // icon bullet
  doc.setTextColor(255, 255, 255);
  doc.text("TERMS & CONDITIONS", margin + 9, yPos + 4.2);
  
  yPos += 10;
  doc.setFontSize(7);
  doc.setTextColor(textColor[0]);

  const terms = [
    "All bookings are subject to availability at the time of confirmation. Seats are confirmed only after receipt of the required booking amount.",
    "This is a fixed group departure; the itinerary, travel dates, hotels, and transport are pre-planned and cannot be changed for individual participants.",
    "The company reserves the right to modify the itinerary, sequence of sightseeing, or accommodation due to operational reasons, weather conditions, road conditions, or any unforeseen circumstances, without compromising the overall travel experience.",
    "Hotel check-in and check-out timings will be as per hotel policy. Early check-in or late check-out is subject to availability and may incur additional charges.",
    "Rooms are provided on a shared basis as per the selected occupancy (quad/triple/double). Single occupancy is subject to availability and extra charges.",
    "The company is not responsible for delays, changes, or cancellations caused by natural calamities, weather conditions, landslides, road blockages, political disturbances, or any other force majeure events.",
    "Any increase in government taxes, permit fees, toll charges, parking fees, or local entry fees applicable during the tour must be paid by the customer directly.",
    "Personal expenses such as laundry, tips, phone calls, medical expenses, additional meals, or any services not mentioned in inclusions are not covered in the package cost.",
    "For trekking or high-altitude destinations, participants must assess their own physical fitness. The company will not be responsible for health-related issues arising during the tour.",
    "Any damage caused to hotel property, vehicles, or public property during the tour shall be borne by the concerned participant.",
    "The company reserves the right to cancel or reschedule a group departure if the minimum required number of participants is not met. In such cases, alternate options or a full refund will be provided.",
    "By booking the tour, the customer confirms that they have read, understood, and agreed to all the terms and conditions mentioned above."
  ];

  terms.forEach((term, index) => {
    // Left serial number in bold
    doc.setFont("helvetica", "bold");
    const numText = `${index + 1}.`;
    doc.text(numText, margin + 2, yPos);
    
    // Wrapped term text in normal font
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(term, contentWidth - 10);
    doc.text(wrapped, margin + 8, yPos);
    
    // Increment yPos based on lines and gap
    yPos += wrapped.length * 3.5 + 1.5;
  });

  // --- FOOTER FOR PAGE 2 ---
  drawFooter();

  // Add new page for Cancellation & Refund Policy (PAGE 3)
  doc.addPage();
  drawHeader();
  yPos = 55;

  // --- CANCELLATION & REFUND POLICY ---
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.roundedRect(margin, yPos, 65, 6, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.circle(margin + 5, yPos + 3, 1.5, "F"); // icon bullet
  doc.setTextColor(255, 255, 255);
  doc.text("CANCELLATION & REFUND POLICY", margin + 9, yPos + 4.2);
  
  yPos += 10;

  // Section 1: Cancellation by Customer
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Cancellation by Customer:", margin + 2, yPos);
  yPos += 5;

  doc.setFontSize(7.5);
  doc.setTextColor(textColor[0]);
  
  // More than 30 days
  doc.setFont("helvetica", "bold");
  doc.text("More than 30 days before departure:", margin + 4, yPos);
  yPos += 4.5;
  doc.setFont("helvetica", "normal");
  doc.circle(margin + 8, yPos - 1, 0.5, "F");
  doc.text("Rs. 5,999 per person (booking amount) will be deducted.", margin + 11, yPos);
  yPos += 4;
  doc.circle(margin + 8, yPos - 1, 0.5, "F");
  doc.text("Balance amount will be refunded.", margin + 11, yPos);
  yPos += 5.5;

  // 15-30 days
  doc.setFont("helvetica", "bold");
  doc.text("15-30 days before departure:", margin + 4, yPos);
  yPos += 4.5;
  doc.setFont("helvetica", "normal");
  doc.circle(margin + 8, yPos - 1, 0.5, "F");
  doc.text("50% of the total tour cost will be deducted.", margin + 11, yPos);
  yPos += 5.5;

  // 7-14 days
  doc.setFont("helvetica", "bold");
  doc.text("7-14 days before departure:", margin + 4, yPos);
  yPos += 4.5;
  doc.setFont("helvetica", "normal");
  doc.circle(margin + 8, yPos - 1, 0.5, "F");
  doc.text("75% of the total tour cost will be deducted.", margin + 11, yPos);
  yPos += 5.5;

  // Less than 7 days
  doc.setFont("helvetica", "bold");
  doc.text("Less than 7 days before departure or No-Show:", margin + 4, yPos);
  yPos += 4.5;
  doc.setFont("helvetica", "normal");
  doc.circle(margin + 8, yPos - 1, 0.5, "F");
  doc.text("100% of the total tour cost will be deducted. No refund will be applicable.", margin + 11, yPos);
  yPos += 9;

  // Section 2: Cancellation by Company
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Cancellation by Company:", margin + 2, yPos);
  yPos += 5;

  doc.setFontSize(7.5);
  doc.setTextColor(textColor[0]);
  doc.setFont("helvetica", "normal");
  
  const compLines = doc.splitTextToSize("If the tour is cancelled by MusafirBaba due to operational reasons or insufficient group size, the customer will be offered:", contentWidth - 10);
  doc.text(compLines, margin + 4, yPos);
  yPos += compLines.length * 4 + 1.5;

  doc.circle(margin + 8, yPos - 1, 0.5, "F");
  doc.text("An alternate departure date OR", margin + 11, yPos);
  yPos += 4;
  doc.circle(margin + 8, yPos - 1, 0.5, "F");
  const compRefLine = doc.splitTextToSize("A full refund of the amount paid (excluding any non-refundable third-party charges, if applicable).", contentWidth - 20);
  doc.text(compRefLine, margin + 11, yPos);
  yPos += compRefLine.length * 4 + 6;

  // Section 3: Important Notes
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Important Notes:", margin + 2, yPos);
  yPos += 5;

  doc.setFontSize(7.5);
  doc.setTextColor(textColor[0]);
  doc.setFont("helvetica", "normal");

  const notes = [
    "Refunds (if applicable) will be processed within 10-15 working days after confirmation of cancellation.",
    "No refund will be provided for any unused services, early departure, or missed sightseeing during the tour.",
    "Advance booking amount is non-refundable once the booking is confirmed.",
    "Cancellation requests will be accepted only in written form via email or WhatsApp."
  ];

  notes.forEach(note => {
    doc.circle(margin + 6, yPos - 1, 0.5, "F");
    const wrappedNote = doc.splitTextToSize(note, contentWidth - 15);
    doc.text(wrappedNote, margin + 9, yPos);
    yPos += wrappedNote.length * 4 + 1.5;
  });

  // --- FOOTER FOR PAGE 3 ---
  drawFooter();

  // Final Action
  if (action === "view") {
    window.open(doc.output("bloburl"), "_blank");
  } else if (action === "dataurl") {
    const blob = doc.output("blob");
    return URL.createObjectURL(blob);
  } else if (action === "base64") {
    return doc.output("datauristring");
  } else {
    doc.save(`${invoice.invoiceNumber}.pdf`);
  }
};
