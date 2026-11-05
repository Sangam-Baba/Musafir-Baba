"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

interface DestinationOption {
  _id: string;
  name: string;
}

// Top-level destinations only (the API leaves sub-destinations out by default)
const getDestinations = async (): Promise<DestinationOption[]> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination?limit=1000`);
  if (!res.ok) throw new Error("Failed to get destinations");
  const data = await res.json();
  return data?.data ?? [];
};

// "Also show in" picker for the package forms. Extra destinations only list
// the package on those /destinations pages; its URL keeps the main destination.
export default function ExtraDestinationSelect({
  destinationId,
  value,
  onChange,
  labelClassName = "text-[12px] font-medium text-slate-700",
  selectClassName = "w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FE5300]",
}: {
  destinationId?: string;
  value?: string[] | null;
  onChange: (value: string[]) => void;
  labelClassName?: string;
  selectClassName?: string;
}) {
  const selected = value ?? [];
  const { data: options = [] } = useQuery({
    queryKey: ["destination", "extra-options"],
    queryFn: getDestinations,
    staleTime: 1000 * 60,
  });

  // The main destination can't also be an extra one
  useEffect(() => {
    if (destinationId && selected.includes(destinationId)) {
      onChange(selected.filter((id) => id !== destinationId));
    }
  }, [destinationId, selected, onChange]);

  const nameOf = (id: string) => options.find((o) => o._id === id)?.name ?? "…";
  const available = options.filter((o) => o._id !== destinationId && !selected.includes(o._id));

  return (
    <div className="space-y-1 md:col-span-2">
      <label className={labelClassName}>
        Also show in destinations{" "}
        <span className="font-normal normal-case tracking-normal text-slate-400">
          (optional, URL stays on the main destination)
        </span>
      </label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1 text-[12px] font-medium text-slate-700"
            >
              {nameOf(id)}
              <button
                type="button"
                onClick={() => onChange(selected.filter((v) => v !== id))}
                aria-label={`Remove ${nameOf(id)}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        value=""
        onChange={(e) => e.target.value && onChange([...selected, e.target.value])}
        className={selectClassName}
      >
        <option value="">Add a destination…</option>
        {available.map((o) => (
          <option key={o._id} value={o._id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
