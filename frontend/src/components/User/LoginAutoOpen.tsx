"use client";

import { useEffect } from "react";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";

export default function LoginAutoOpen({ auth }: { auth: string | null }) {
  const openDialog = useAuthDialogStore((s) => s.openDialog);

  useEffect(() => {
    if (auth === "login") {
      openDialog("login", undefined, "/user/profile");
    }
  }, [auth]);

  return null;
}
