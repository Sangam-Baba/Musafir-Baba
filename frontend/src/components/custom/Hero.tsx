"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import React from "react";

type Align = "left" | "center" | "right";

type Height = "sm" | "md" | "lg" | "xl";

export interface HeroProps {
  image: string;

  title: string;

  description?: string;

  align?: Align;

  height?: Height;

  overlayOpacity?: number;

  className?: string;

  children?: React.ReactNode;
}

const heightToClasses: Record<Height, string> = {
  sm: "h-[260px] md:h-[320px]",
  md: "h-[360px] md:h-[420px]",
  lg: "h-[460px] md:h-[520px]",
  xl: "h-[560px] md:h-[640px]",
};

export default function Hero({
  image,
  title,
  description,
  align = "center",
  height = "md",
  overlayOpacity = 60,
  className = "",
  children,
}: HeroProps) {
  const overlay = Math.min(100, Math.max(0, overlayOpacity));

  return (
    <section
      className={`relative w-full ${heightToClasses[height]}  ${className}`}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          style={{ opacity: overlay / 100 }}
        />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 h-full flex items-center ${
          align === "left"
            ? "justify-start text-left"
            : align === "right"
            ? "justify-end text-right"
            : "justify-center text-center"
        }`}
      >
        <div
          className={`px-4 md:px-8 ${
            align === "center" ? "w-full max-w-6xl" : "max-w-2xl"
          }`}
        >
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-white text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight text-center"
          >
            {title}
          </motion.h1>

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="mt-3 md:mt-4  text-white/90 text-sm md:text-base  text-center "
            >
              {description}
            </motion.p>
          )}

          {children && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
              className="mt-5 flex flex-wrap gap-3"
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
