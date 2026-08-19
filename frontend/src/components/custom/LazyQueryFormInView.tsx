"use client";

import { useEffect, useRef, useState } from "react";
import LazyQueryForm from "./LazyQueryForm";

export default function LazyQueryFormInView({
  variant = "default",
  formId,
}: {
  variant?: "default" | "minimal" | "grid";
  formId?: string;
}) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Load slightly before it comes into view
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full h-full min-h-[400px]">
      {inView ? <LazyQueryForm variant={variant} formId={formId} /> : null}
    </div>
  );
}
