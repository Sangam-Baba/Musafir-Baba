"use client";

import dynamic from "next/dynamic";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";

const AuthDialogChunk = dynamic(
  () => import("./AuthDialog").then((mod) => ({ default: mod.AuthDialog })),
  { ssr: false }
);

export function LazyAuthDialog() {
  const isOpen = useAuthDialogStore((state) => state.isOpen);
  if (!isOpen) return null;
  return <AuthDialogChunk />;
}
