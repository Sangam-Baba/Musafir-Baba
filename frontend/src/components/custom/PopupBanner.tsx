"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function PopupBanner() {
  const [open, setOpen] = React.useState(true);

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
        {/* Image */}
        <div className="relative w-full aspect-6/4">
          <Image
            src="https://cdn.musafirbaba.com/images/CHARDHAM%20YATRA%202026%20SALE.jpg.jpeg"
            alt="Special offer"
            fill
            priority
            className="object-cover"
          />
        </div>

        {/* CTA */}
        <div className="p-4 bg-white">
          <Link
            href="/https://musafirbaba.com/holidays/religious-tours/uttarakhand/divine-chardham-yatra"
            className="block"
          >
            <Button className="w-full font-semibold">Book Now</Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
