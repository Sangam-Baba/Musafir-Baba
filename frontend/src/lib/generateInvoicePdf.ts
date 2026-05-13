import { jsPDF } from "jspdf";
import { Invoice } from "@/app/admin/invoices/page";

export const generateInvoicePDF = (invoice: Invoice, action: "view" | "download" = "download") => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // --- HEADER & BRANDING ---
  doc.setCharSpace(0);
  doc.setFontSize(18);
  doc.setTextColor(254, 83, 0); // #FE5300
  doc.setFont("helvetica", "bold");
  doc.text("Musafir Baba", margin, yPos);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Premium Travel Experiences", margin, yPos + 5);
  doc.text("www.musafirbaba.com | +91 92896 02447", margin, yPos + 10);

  // --- INVOICE TITLE ---
  doc.setFontSize(16);
  doc.setTextColor(150); // Subtle grey instead of harsh dark text
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", pageWidth - margin, yPos + 5, { align: "right" });

  yPos += 20;

  // Horizontal Line
  doc.setDrawColor(254, 83, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 10;

  // --- INVOICE DETAILS & CLIENT INFO ---
  // Left Side: Bill To
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", margin, yPos);
  
  doc.setTextColor(50);
  doc.text(invoice.clientName || "Client Name", margin, yPos + 6);
  
  doc.setFont("helvetica", "normal");
  if (invoice.clientPhone) doc.text(invoice.clientPhone, margin, yPos + 11);
  if (invoice.clientEmail) doc.text(invoice.clientEmail, margin, yPos + 16);
  if (invoice.clientAddress) {
    const addressLines = doc.splitTextToSize(invoice.clientAddress, 70);
    doc.text(addressLines, margin, yPos + 21);
  }

  // Right Side: Details
  const rightColX = pageWidth - margin - 60;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150);
  
  doc.text("INVOICE NO:", rightColX, yPos);
  doc.text("DATE:", rightColX, yPos + 6);
  if (invoice.dueDate) doc.text("DUE DATE:", rightColX, yPos + 12);

  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceNumber, pageWidth - margin, yPos, { align: "right" });
  
  const formattedDate = new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
  doc.text(formattedDate, pageWidth - margin, yPos + 6, { align: "right" });

  if (invoice.dueDate) {
    const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
    doc.text(dueDate, pageWidth - margin, yPos + 12, { align: "right" });
  }

  yPos += 45;

  // --- ITEMS TABLE HEADER ---
  doc.setFillColor(254, 83, 0);
  doc.rect(margin, yPos, contentWidth, 10, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  
  // Columns: Description (80), Qty (30), Price (30), Amount (30)
  doc.text("DESCRIPTION", margin + 5, yPos + 7);
  doc.text("QTY", margin + 95, yPos + 7, { align: "center" });
  doc.text("PRICE (Rs)", margin + 130, yPos + 7, { align: "right" });
  doc.text("AMOUNT (Rs)", pageWidth - margin - 5, yPos + 7, { align: "right" });

  yPos += 10;

  // --- ITEMS LIST ---
  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");

  invoice.items.forEach((item, index) => {
    const bgY = yPos;
    // Alternate row backgrounds
    if (index % 2 !== 0) {
      doc.setFillColor(249, 250, 251); // slate-50
      doc.rect(margin, bgY, contentWidth, 12, "F");
    }

    // Truncate/wrap description if needed
    const desc = doc.splitTextToSize(item.description, 80);
    doc.text(desc, margin + 5, yPos + 8);
    
    doc.text(item.quantity.toString(), margin + 95, yPos + 8, { align: "center" });
    doc.text(item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 }), margin + 130, yPos + 8, { align: "right" });
    doc.text(item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }), pageWidth - margin - 5, yPos + 8, { align: "right" });

    yPos += Math.max(12, desc.length * 5 + 4);
  });

  yPos += 5;
  doc.setDrawColor(220);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // --- TOTALS ---
  const totalsX = pageWidth - margin - 40;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Subtotal:", totalsX, yPos, { align: "right" });
  doc.setTextColor(50);
  doc.text(`Rs. ${invoice.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, yPos, { align: "right" });
  yPos += 6;

  if (invoice.taxAmount > 0) {
    doc.setTextColor(100);
    doc.text(`Tax (${invoice.taxRate}%):`, totalsX, yPos, { align: "right" });
    doc.setTextColor(50);
    doc.text(`Rs. ${invoice.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, yPos, { align: "right" });
    yPos += 6;
  }

  if (invoice.discountAmount > 0) {
    doc.setTextColor(100);
    doc.text("Discount:", totalsX, yPos, { align: "right" });
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`- Rs. ${invoice.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, yPos, { align: "right" });
    yPos += 6;
  }

  yPos += 4;
  
  // Final Total Box
  doc.setFillColor(255, 245, 235); // Solid Light orange bg
  doc.rect(totalsX - 30, yPos, 75, 12, "F");
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(254, 83, 0);
  doc.text("TOTAL:", totalsX, yPos + 8, { align: "right" });
  doc.text(`Rs. ${invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, yPos + 8, { align: "right" });

  yPos += 30;

  // --- NOTES ---
  if (invoice.notes) {
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.setFont("helvetica", "bold");
    doc.text("Notes / Terms:", margin, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    const notesLines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(notesLines, margin, yPos + 6);
  }

  // --- FOOTER ---
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.setDrawColor(240);
  doc.line(margin, pageHeight - margin + 5, pageWidth - margin, pageHeight - margin + 5);
  doc.text("Thank you for choosing Musafir Baba!", pageWidth / 2, pageHeight - margin + 12, { align: "center" });

  if (action === "view") {
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`${invoice.invoiceNumber}.pdf`);
  }
};
