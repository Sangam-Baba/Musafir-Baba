"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface SubDestinationOption {
  _id: string;
  name: string;
}

const getSubDestinations = async (parentId: string): Promise<SubDestinationOption[]> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destination?parent=${parentId}&limit=1000`,
  );
  if (!res.ok) throw new Error("Failed to get sub-destinations");
  const data = await res.json();
  return data?.data ?? [];
};

// Optional sub-destination picker for the package forms. Renders nothing
// unless the selected destination has sub-destinations, and clears a value
// that doesn't belong to the selected destination.
export default function SubDestinationSelect({
  destinationId,
  value,
  onChange,
  className,
  labelClassName = "text-[12px] font-medium text-slate-700",
}: {
  destinationId?: string;
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
  labelClassName?: string;
}) {
  const { data: options, isSuccess } = useQuery({
    queryKey: ["destination", "sub-options", destinationId],
    queryFn: () => getSubDestinations(destinationId as string),
    enabled: !!destinationId,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!value) return;
    if (!destinationId) {
      onChange("");
      return;
    }
    if (isSuccess && !options.some((o) => o._id === value)) onChange("");
  }, [destinationId, isSuccess, options, value, onChange]);

  if (!options || options.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <label className={labelClassName}>Sub-destination</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        <option value="">None</option>
        {options.map((o) => (
          <option key={o._id} value={o._id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
