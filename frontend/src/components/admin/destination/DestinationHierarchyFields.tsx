"use client";

import { useQuery } from "@tanstack/react-query";
import { fleetSelectClass } from "@/components/admin/fleet/FleetUI";
import { Field } from "@/components/admin/destination/FormBits";

export interface ParentDestinationOption {
  _id: string;
  name: string;
  country: string;
  state: string;
}

// Top-level destinations only (the API leaves sub-destinations out by default)
const getParentOptions = async (): Promise<ParentDestinationOption[]> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination?limit=1000`);
  if (!res.ok) throw new Error("Failed to get destinations");
  const data = await res.json();
  return data?.data ?? [];
};

// Region + parent pickers shared by the create and edit destination forms
export default function DestinationHierarchyFields({
  parent,
  region,
  excludeId,
  onParentChange,
  onRegionChange,
}: {
  parent: string;
  region: string;
  excludeId?: string;
  onParentChange: (parent: ParentDestinationOption | null) => void;
  onRegionChange: (region: string) => void;
}) {
  const { data: options = [] } = useQuery({
    queryKey: ["destination", "parent-options"],
    queryFn: getParentOptions,
    staleTime: 1000 * 60,
  });

  return (
    <>
      <Field
        label="Parent Destination"
        hint={
          parent
            ? "Sub-destination page: /destinations/{parent}/{name}"
            : "Leave empty for a main destination."
        }
      >
        <select
          value={parent}
          onChange={(e) => onParentChange(options.find((o) => o._id === e.target.value) ?? null)}
          className={`${fleetSelectClass} h-9 w-full`}
        >
          <option value="">None (main destination)</option>
          {options
            .filter((o) => o._id !== excludeId)
            .map((o) => (
              <option key={o._id} value={o._id}>
                {o.name}
              </option>
            ))}
        </select>
      </Field>
      {!parent && (
        <Field label="Region" hint="Decides the Domestic / International section on /destinations.">
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className={`${fleetSelectClass} h-9 w-full`}
          >
            <option value="">Auto (India = Domestic)</option>
            <option value="domestic">Domestic</option>
            <option value="international">International</option>
          </select>
        </Field>
      )}
    </>
  );
}
