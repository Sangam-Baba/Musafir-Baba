import { Invoice } from "@/app/admin/invoices/page";
import { jsPDF } from "jspdf";

export const generateInvoicePDF = (invoice: Invoice, action: "view" | "download" = "download") => {
  const doc = new jsPDF();
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
      doc.addImage("/invoice_pdf_header.png", "PNG", 0, 0, pageWidth, 50);
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
    
    const drawFooterIconText = (text: string, x: number, y: number) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.circle(x, y - 1, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(text, x + 4, y);
    };

    drawFooterIconText("+91 92896 02447", 15, footerY + 8);
    drawFooterIconText("07CEKPR2608F2ZF", 15, footerY + 14);

    drawFooterIconText("care@musafirbaba.com", pageWidth / 2 - 20, footerY + 8);
    drawFooterIconText("www.musafirbaba.com", pageWidth / 2 - 20, footerY + 14);

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(pageWidth - 65, footerY + 7, 1.5, "F");
    
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
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, yPos, contentWidth, 24, 3, 3, "S");
  
  doc.setFontSize(8);
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
  const rightX = pageWidth / 2 + 5;
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
  doc.text(invoice.remarks || "N/A", rightX + 50, infoY);

  yPos += 30;

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
    invoice.paymentSummary?.paymentId || "UPI/515850948410",
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

  // --- TERMS & CONDITIONS ---
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.roundedRect(margin, yPos, 50, 6, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.circle(margin + 5, yPos + 3, 1.5, "F"); // icon bullet
  doc.setTextColor(255, 255, 255);
  doc.text("TERMS & CONDITIONS", margin + 9, yPos + 4.2);
  
  yPos += 6;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.rect(margin, yPos, contentWidth, 34, "S");
  
  yPos += 4;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0]);

  const terms = [
    "An advance payment of 50% of the total booking amount is required to confirm the booking.",
    "The remaining balance amount must be paid 7 days before the departure date.",
    "In case of non-payment or cancellation 7 days post booking, token amount is non-refundable.",
    "Payments can be made via bank transfer, credit card, or mutually agreed methods. Fees apply.",
    "Certain services like flights and hotels are non-refundable after payment.",
    "Musafirbaba Travels reserves the right to make itinerary changes due to unforeseen events.",
    "Customer is responsible for carrying valid travel documents (passport, visa)."
  ];

  terms.forEach(term => {
    doc.setFillColor(textColor[0], textColor[1], textColor[2]);
    doc.circle(margin + 4, yPos - 1, 0.5, "F");
    doc.text(term, margin + 7, yPos);
    yPos += 4.5;
  });

  // --- FOOTER FOR PAGE 2 ---
  drawFooter();

  // Final Action
  if (action === "view") {
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`${invoice.invoiceNumber}.pdf`);
  }
};
