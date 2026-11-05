"use client";

import { useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { Check } from "lucide-react";

interface SubDestinationOption {
  _id: string;
  name: string;
  parent?: { _id: string; name: string } | null;
}

type IdLike = string | { _id?: string } | null | undefined;

// Merge ids from populated/unpopulated refs (and the older single
// `subDestination`) into a unique list of id strings.
export function toIdList(...values: (IdLike | IdLike[])[]): string[] {
  const ids = values
    .flat()
    .map((v) => (typeof v === "object" && v ? v._id : v))
    .filter((v): v is string => !!v)
    .map(String);
  return [...new Set(ids)];
}

const getSubDestinations = async (parentId: string): Promise<SubDestinationOption[]> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destination?parent=${parentId}&limit=1000`,
  );
  if (!res.ok) throw new Error("Failed to get sub-destinations");
  const data = await res.json();
  return data?.data ?? [];
};

// Optional multi-select sub-destination picker for the package forms. Lists
// the sub-destinations of the main destination and of any extra
// destinations, renders nothing when there are none, and drops values that
// don't belong to any of them.
export default function SubDestinationSelect({
  destinationId,
  extraDestinationIds,
  value,
  onChange,
  labelClassName = "text-[12px] font-medium text-slate-700",
}: {
  destinationId?: string;
  extraDestinationIds?: string[] | null;
  value?: string[] | null;
  onChange: (value: string[]) => void;
  labelClassName?: string;
}) {
  const selected = value ?? [];
  const parentIds = destinationId
    ? toIdList(destinationId, extraDestinationIds ?? [])
    : [];

  const results = useQueries({
    queries: parentIds.map((id) => ({
      queryKey: ["destination", "sub-options", id],
      queryFn: () => getSubDestinations(id),
      staleTime: 1000 * 60,
    })),
  });
  const allLoaded = results.every((r) => r.isSuccess);
  const groups = parentIds
    .map((id, i) => ({ id, options: results[i]?.data ?? [] }))
    .filter((g) => g.options.length > 0);
  const optionIds = groups.flatMap((g) => g.options.map((o) => o._id));

  useEffect(() => {
    if (selected.length === 0) return;
    if (!destinationId) {
      onChange([]);
      return;
    }
    if (!allLoaded) return;
    const valid = selected.filter((id) => optionIds.includes(id));
    if (valid.length !== selected.length) onChange(valid);
  }, [destinationId, allLoaded, optionIds, selected, onChange]);

  if (groups.length === 0) return null;

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);

  return (
    <div className="space-y-1 md:col-span-2">
      <label className={labelClassName}>
        Sub-destinations{" "}
        <span className="font-normal normal-case tracking-normal text-slate-400">
          (optional, select one or more)
        </span>
      </label>
      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            {groups.length > 1 && (
              <p className="text-[11px] font-medium text-slate-400">
                {group.options[0]?.parent?.name}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((o) => {
                const active = selected.includes(o._id);
                return (
                  <button
                    key={o._id}
                    type="button"
                    onClick={() => toggle(o._id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      active
                        ? "border-[#FE5300] bg-orange-50 text-[#FE5300]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#FE5300]/40"
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
                        active ? "border-[#FE5300] bg-[#FE5300] text-white" : "border-slate-300"
                      }`}
                    >
                      {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </span>
                    {o.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
