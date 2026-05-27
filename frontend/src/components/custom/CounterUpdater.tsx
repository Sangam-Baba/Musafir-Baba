"use client";

import { useEffect } from "react";

const updateCounter = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/counter/68e6549442582b78aea7c191`,
    { method: "PATCH" }
  );
  if (!res.ok) throw new Error("Failed to update counter");
  return res.json();
};

export default function CounterUpdater() {
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => updateCounter());
    } else {
      setTimeout(updateCounter, 1000);
    }
  }, []);

  return null;
}
