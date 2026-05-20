"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PopupBannerProps {
  _id: string;
  button: {
    title: string;
    url: string;
  };
  coverImage: {
    url: string;
    alt: string;
  };
}

export function PopupBanner() {
  return null; // Commented out homepage popup

  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<PopupBannerProps | null>(null);

  React.useEffect(() => {
    const fetchPopup = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/popup/page/home`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (res.ok) {
          const result = await res.json();
          if (result?.data) {
            setData(result.data);
            setOpen(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch popup data:", error);
      }
    };

    // Small delay to ensure main content renders first
    const timer = setTimeout(() => {
      fetchPopup();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="
      p-0
      overflow-hidden
      w-full
      sm:max-w-[620px]
        md:max-w-[700px]
      rounded-xl
    "
      >
        <DialogTitle className="sr-only">Special Offer</DialogTitle>
        <DialogDescription className="sr-only">Check out our latest special offer for this season.</DialogDescription>
        {/* Image */}
        <div className="relative w-full aspect-6/4">
          <Image
            src={
              data?.coverImage?.url ||
              "https://cdn.musafirbaba.com/images/CHARDHAM%20YATRA%202026%20SALE.jpg.jpeg"
            }
            alt={data?.coverImage?.alt || "Special offer"}
            fill
            sizes="(max-width: 620px) 100vw, 700px"
            priority
            className="object-cover"
          />
        </div>

        {/* CTA */}
        <div className="p-4 bg-white">
          <Link
            href={
              data?.button?.url ||
              "https://musafirbaba.com/holidays/religious-tours/uttarakhand/divine-chardham-yatra"
            }
            target="_blank"
            className="block max-w-[100px] mx-auto"
          >
            <Button className="w-full font-semibold">
              {data?.button?.title || "Book Now"}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
