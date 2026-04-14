"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { z } from "zod";

import React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { stripHtml } from "@/lib/utils";
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  packageId: z.string(),
});

export interface ItineraryItem {
  title: string;
  description: string;
}

type FormData = z.infer<typeof formSchema>;

const createItinerary = async (data: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  return res.json();
};
export function ItineryDialog({
  title,
  description,
  url,
  img,
  packageId,
  itinerary,
  duration,
}: {
  title: string;
  description: string;
  url: string;
  img: string;
  packageId: string;
  itinerary?: ItineraryItem[];
  duration?: string;
}) {
  const [data, setData] = React.useState<FormData>({
    email: "",
    packageId: packageId,
  });
  const [loading, setLoading] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const cleanPdfText = (text: string) => {
    return stripHtml(text)
      .replace(/→/g, "->")
      .replace(/–/g, "-") // En dash
      .replace(/—/g, "-") // Em dash
      .replace(/[^\x00-\x7F]/g, "") // Remove any remaining non-ASCII characters
      .trim();
  };

  const generateDynamicPDF = (
    docTitle: string, 
    docDescription: string, 
    items: ItineraryItem[], 
    pkgDuration?: string
  ) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    const addHeader = (d: jsPDF) => {
      // Reset spacing in case it was modified
      d.setCharSpace(0);
      
      // Branding
      d.setFontSize(22);
      d.setTextColor(254, 83, 0); // #FE5300
      d.setFont("helvetica", "bold");
      d.text("Musafir Baba", margin, margin + 5);
      
      d.setFontSize(10);
      d.setTextColor(100);
      d.setFont("helvetica", "normal");
      d.text("Premium Travel Experiences", margin, margin + 11);
      
      // Horizontal Line
      d.setDrawColor(254, 83, 0);
      d.setLineWidth(0.5);
      d.line(margin, margin + 16, pageWidth - margin, margin + 16);
      
      return margin + 28;
    };

    const addFooter = (d: jsPDF, pageNum: number) => {
      d.setCharSpace(0);
      d.setFontSize(9);
      d.setTextColor(150);
      d.setFont("helvetica", "normal");
      
      d.setDrawColor(240);
      d.line(margin, pageHeight - margin + 5, pageWidth - margin, pageHeight - margin + 5);
      
      d.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - margin + 12, { align: "right" });
      d.text("www.musafirbaba.com | +91 92896 02447", margin, pageHeight - margin + 12);
    };

    // Initial Header
    yPos = addHeader(doc);

    // Package Header Section
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(cleanPdfText(docTitle), contentWidth);
    doc.text(titleLines, margin, yPos);
    yPos += (titleLines.length * 8) + 4;

    if (pkgDuration) {
      doc.setFontSize(12);
      doc.setTextColor(254, 83, 0);
      doc.text(`Duration: ${pkgDuration}`, margin, yPos);
      yPos += 10;
    }

    // Main Description
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");
    const cleanDesc = cleanPdfText(docDescription);
    const descLines = doc.splitTextToSize(cleanDesc, contentWidth);
    doc.text(descLines, margin, yPos);
    yPos += (descLines.length * 6) + 15;

    // Itinerary Section Title
    doc.setFontSize(14);
    doc.setTextColor(254, 83, 0);
    doc.setFont("helvetica", "bold");
    doc.text("TOUR ITINERARY", margin, yPos);
    yPos += 8;
    doc.setDrawColor(254, 83, 0);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos, margin + 40, yPos);
    yPos += 12;

    // Day-by-Day Content
    items.forEach((item, index) => {
      const cleanTitle = cleanPdfText(item.title);
      const cleanInfo = cleanPdfText(item.description);
      
      const itemTitleLines = doc.splitTextToSize(cleanTitle, contentWidth - 5);
      const itemDescLines = doc.splitTextToSize(cleanInfo, contentWidth - 10);
      
      const itemHeight = (itemTitleLines.length * 7) + (itemDescLines.length * 6) + 10;

      // Page Break Check
      if (yPos + itemHeight > pageHeight - margin - 15) {
        addFooter(doc, doc.getNumberOfPages());
        doc.addPage();
        yPos = addHeader(doc);
      }

      // Day Title with Accent
      doc.setCharSpace(0); // Ensure clean spacing for heading
      doc.setFillColor(255, 245, 240); // Very light orange background
      doc.rect(margin - 2, yPos - 5, contentWidth + 4, (itemTitleLines.length * 7) + 2, "F");
      
      doc.setFontSize(11);
      doc.setTextColor(254, 83, 0);
      doc.setFont("helvetica", "bold");
      doc.text(itemTitleLines, margin, yPos);
      yPos += (itemTitleLines.length * 7) + 4;

      // Day Description
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.setFont("helvetica", "normal");
      doc.text(itemDescLines, margin + 5, yPos);
      yPos += (itemDescLines.length * 6) + 12;
    });

    // Final Footer for all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i);
    }

    doc.save(`${docTitle.replace(/\s+/g, "_")}_Itinerary.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const validationResult = formSchema.safeParse(data);
      if (!validationResult.success) {
        toast.error(validationResult.error.issues[0]?.message || "Invalid input");
        return;
      }

      await createItinerary(data);
      
      // Check if we have meaningful itinerary data in text form
      const hasItineraryText = itinerary && itinerary.length > 0 && 
        itinerary.some(item => item.title.trim() !== "" || item.description.trim() !== "");

      // Check if the provided URL is valid and not a known placeholder/dummy
      const isPlaceholderUrl = (u: string) => {
        const lower = u.toLowerCase();
        return lower.includes("test.pdf") || lower.includes("tesst.pdf") || lower.endsWith(".jpg") || lower.endsWith(".png");
      };
      
      const hasValidUrl = url && url.trim() !== "" && !isPlaceholderUrl(url);

      // PRIORITY 1: Use textual itinerary data if it's available (prefer dynamic generation)
      if (hasItineraryText) {
        generateDynamicPDF(title, description, itinerary!, duration);
        toast.success("Itinerary generated and downloaded!");
      } 
      // PRIORITY 2: Fallback to the provided URL if it's a real file and we have no text data
      else if (hasValidUrl) {
        const link = document.createElement("a");
        link.href = url;
        link.download = title + ".pdf";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } 
      // FALLBACK: No valid data available
      else {
         toast.error("Itinerary data is currently unavailable for this package.");
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size={"sm"}
          className="bg-[#FE5300] hover:bg-[#e04a00] text-white hover:text-white text-xs md:text-sm"
        >
          Itinerary
          <Download className="w-2 h-2 md:w-5 md:h-5 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="flex flex-row gap-4">
            <Image
              src={img}
              width={100}
              height={100}
              alt={title}
              className="rounded-lg"
            />
            <div className="flex flex-col gap-2">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="line-clamp-2">
                {stripHtml(description)}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={data.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Download"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
