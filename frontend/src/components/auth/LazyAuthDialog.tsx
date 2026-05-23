"use client";

import dynamic from "next/dynamic";

export const LazyAuthDialog = dynamic(
  () => import("./AuthDialog").then((mod) => ({ default: mod.AuthDialog })),
  { ssr: false }
);
