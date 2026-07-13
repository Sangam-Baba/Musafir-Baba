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

import React, { useState, useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { stripHtml } from "@/lib/utils";
import html2canvas from "html2canvas";
import { ItineraryTemplate } from "./ItineraryTemplate";
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000/api';
  
  try {
    const res = await fetch(`${baseUrl}/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Primary API endpoint failed, trying fallback:", err);
  }

  // Fallback to local port 8000 if primary fails
  const fallbackUrl = 'http://localhost:8000/api';
  if (baseUrl !== fallbackUrl) {
    const res = await fetch(`${fallbackUrl}/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
  }

  throw new Error("Failed to create contact");
};
export function ItineryDialog({
  title,
  description,
  fullDescription,
  url,
  img,
  packageId,
  itinerary,
  duration,
  highlights,
  destination,
  gallery,
  inclusions = [],
  exclusions = [],
  batch = [],
  packageEssentials,
}: {
  title: string;
  description: string;
  fullDescription?: string;
  url: string;
  img: string;
  packageId: string;
  itinerary?: ItineraryItem[];
  duration?: string;
  highlights?: string[];
  destination?: string;
  gallery?: { url: string; alt: string }[];
  inclusions?: string[];
  exclusions?: string[];
  batch?: any[];
  packageEssentials?: string;
}) {
  const [data, setData] = React.useState<FormData>({
    email: "",
    packageId: packageId,
  });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const generateDynamicPDF = async (
    docTitle: string, 
  ) => {
    if (!templateRef.current) {
      throw new Error("Template reference not found.");
    }

    // Give it a moment to ensure fonts and styles are fully rendered
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The template has multiple A4-sized children (Cover + Pages)
    // We capture each one and add it to the PDF
    const pages = (Array.from(templateRef.current.children) as HTMLElement[]).filter(
      (el) => el.tagName.toLowerCase() === "div"
    );
    if (pages.length === 0) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [794, 1123], // A4 at 96 DPI
      compress: true
    });

    const imgPromises = pages.map(async (pageElement) => {
      const canvas = await html2canvas(pageElement, {
        scale: 1.5,
        backgroundColor: "#fdfbf7",
        useCORS: true,
        logging: false,
      });
      return canvas.toDataURL("image/jpeg", 0.85);
    });

    const imgDataArray = await Promise.all(imgPromises);

    for (let i = 0; i < imgDataArray.length; i++) {
      if (i > 0) {
        doc.addPage([794, 1123]);
      }
      doc.addImage(imgDataArray[i], "JPEG", 0, 0, 794, 1123, undefined, "FAST");

      // Extract and map HTML links to PDF clickable areas
      const pageElement = pages[i];
      const pageRect = pageElement.getBoundingClientRect();
      const links = pageElement.querySelectorAll('a[href]');
      
      links.forEach((link) => {
        const linkRect = link.getBoundingClientRect();
        
        // Ensure the link is actually visible and has dimensions
        if (linkRect.width > 0 && linkRect.height > 0) {
          // Calculate coordinates relative to the top-left of the A4 page container
          const x = linkRect.left - pageRect.left;
          const y = linkRect.top - pageRect.top;
          
          // Map to PDF units (which is 1:1 since we configured jsPDF to use 'px' with [794, 1123])
          doc.link(x, y, linkRect.width, linkRect.height, { url: (link as HTMLAnchorElement).href });
        }
      });
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
        itinerary.some(item => (item.title && typeof item.title === 'string' && item.title.trim() !== "") || (item.description && typeof item.description === 'string' && item.description.trim() !== ""));

      // Check if the provided URL is valid and not a known placeholder/dummy
      const isPlaceholderUrl = (u: string) => {
        if (!u || typeof u !== 'string') return false;
        const lower = u.toLowerCase();
        return lower.includes("test.pdf") || lower.includes("tesst.pdf") || lower.endsWith(".jpg") || lower.endsWith(".png");
      };
      
      const hasValidUrl = url && typeof url === 'string' && url.trim() !== "" && !isPlaceholderUrl(url);

      // PRIORITY 1: Use textual itinerary data if it's available (prefer dynamic generation)
      if (hasItineraryText) {
        await generateDynamicPDF(title);
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
      console.error("=== PDF GENERATION ERROR DETAILS ===");
      console.error("Raw Error Object:", error);
      try {
        console.dir(error);
        console.error("Error Properties:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error("Could not stringify error properties.");
      }
      if (error instanceof Error) {
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack);
      }
      console.error("=====================================");

      let errMsg = "Unknown error";
      if (error instanceof Error) errMsg = error.message;
      else if (typeof error === 'string') errMsg = error;
      else if (error && typeof error === 'object') errMsg = JSON.stringify(error, Object.getOwnPropertyNames(error));
      toast.error(`Failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };
  if (!mounted) {
    return (
      <Button
        size={"sm"}
        className="bg-[#FE5300] hover:bg-[#e04a00] text-white hover:text-white text-xs md:text-sm"
      >
        Itinerary
        <Download className="w-2 h-2 md:w-5 md:h-5 ml-2" />
      </Button>
    );
  }

  return (
    <>
      {/* HIDDEN RENDER TARGET FOR PDF - rendered at document root level so it is not clipped by Dialog transforms */}
      <ItineraryTemplate 
        ref={templateRef}
        title={title}
        description={description}
        itinerary={itinerary || []}
        duration={duration}
        img={img}
        highlights={highlights || []}
        destination={destination || ''}
        gallery={gallery}
        inclusions={inclusions}
        exclusions={exclusions}
        batch={batch}
        packageEssentials={packageEssentials}
        fullDescription={fullDescription || description}
      />

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
              {img ? (
                <Image
                  src={img}
                  width={100}
                  height={100}
                  alt={title}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-[100px] h-[100px] bg-slate-100 rounded-lg shrink-0 flex items-center justify-center">
                  <span className="text-xs text-slate-400">No Image</span>
                </div>
              )}
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
    </>
  );
}
