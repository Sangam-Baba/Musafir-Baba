"use client";

import { useEffect, useState } from "react";
import { useCarousel } from "@/components/ui/carousel";

export function CarouselDots() {
  const { api } = useCarousel(); // Embla API
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setSnapCount(api.scrollSnapList().length);
    setSelectedIndex(api.selectedScrollSnap());

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      {Array.from({ length: snapCount }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to slide ${i + 1}`}
          onClick={() => api?.scrollTo(i)}
          className="p-2.5 flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full transition-colors"
        >
          <span
            className={`h-2 rounded-full transition-all block ${
              i === selectedIndex ? "bg-[#FE5300] w-4" : "bg-gray-300 w-2"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
