"use client";
import React from "react";
import { Button } from "../ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { useRouter } from "next/navigation";

export default function PlanMyTrip() {
  const router = useRouter();
  const { openDialog } = useAuthDialogStore();
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const handleClick = () => {
    if (!accessToken) {
      openDialog("login", undefined, "/plan-my-trip");
      return;
    }
    router.push(`/plan-my-trip`);
  };

  return (
    <div className="fixed top-69 -right-9 z-50 flex items-center gap-2 rotate-[270deg] ">
      <Button
        onClick={handleClick}
        className="bg-[#87E87F] text-black hover:bg-[#87E87F] hover:text-black"
      >
        Plan My Trip
      </Button>
    </div>
  );
}
