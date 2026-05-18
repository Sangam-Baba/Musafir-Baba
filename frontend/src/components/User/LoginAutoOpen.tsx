"use client";

import { useEffect } from "react";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { useSearchParams } from "next/navigation";

export default function LoginAutoOpen() {
  const openDialog = useAuthDialogStore((s) => s.openDialog);
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");

  useEffect(() => {
    if (auth === "login") {
      openDialog("login", undefined, "/user/profile");
    }
  }, [auth]);

  return null;
}
