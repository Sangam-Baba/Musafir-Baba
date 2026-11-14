"use client";
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, CheckCircle2, Copy, FilePen, Loader2, MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import UsersList from "@/components/admin/UsersList";
import CreateEditStaff from "@/components/auth/CreateEditStaff";
import { Button } from "@/components/ui/button";
import VehiclesList from "@/components/admin/VehicleList";
import VehiclePreviewDrawer from "@/components/admin/VehiclePreviewDrawer";
import { Input } from "@/components/ui/input";
import { FleetKpiStrip, FleetPage, FleetPanel, fleetSelectClass } from "@/components/admin/fleet/FleetUI";
import { RentalPageHeader, rPrimaryBtn } from "@/components/admin/rental/RentalAdminUI";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export interface IVehicleData {
  _id: string;
  vehicleName: string;
  location: string;
  vehicleType: string;
  vehicleYear: string;
  vehicleBrand: string;
  vehicleMilage?: string;
  fuelType: string;
  tripProtectionFee: number;
  convenienceFee: number;
  vehicleTransmission: string;
  price: {
    daily: number;
    hourly: number;
  };
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  vehicleModel?: string;
  gallery?: {
    url: string;
    title?: string;
    alt: string;
  };
  vehicleAtAGlance?: string;
  quickAnswers?: string;
  availableFor?: string;
  rentalOptions?: string;
  howBookingWorks?: string;
  helpfulResources?: { title: string; url: string; }[];
  status: string;
}

interface QueryParams {
  data: IVehicleData[];
}

const getAllVehicle = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch Vehicle", { cause: res });
  const data = await res.json();
  return data;
};
interface IPickupDestination {
  _id: string;
  name: string;
  city?: string;
  status?: string;
}

// All pickup destinations (inactive too) so every vehicle's city can be named
const getPickupDestinations = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination?all=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error("Failed to fetch destinations");
  return res.json();
};

const duplicateVehicle = async (accessToken: string, id: string, location: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/${id}/duplicate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ location }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Failed to duplicate vehicle");
  return body;
};

function VehiclePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions,
  ) as string[];

  const { data, isLoading, isError, error } = useQuery<QueryParams>({
    queryKey: ["vehicle"],
    queryFn: () => getAllVehicle(accessToken),
    retry: 2,
    enabled: permissions.includes("vehicle"),
  });
  const vehicles = data?.data ?? [];

  const { data: destinationsRes } = useQuery<{ data: IPickupDestination[] }>({
    queryKey: ["master-data", "pickup-destination", "all"],
    queryFn: () => getPickupDestinations(accessToken),
    enabled: permissions.includes("vehicle"),
  });
  const destinations = destinationsRes?.data ?? [];
  const destinationName = (id?: string) =>
    destinations.find((d) => d._id === id)?.name;

  // "Duplicate to another city" dialog
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  // Vehicle page preview (drawer, like the packages list)
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [duplicateTo, setDuplicateTo] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const duplicateSource = vehicles.find((v) => v._id === duplicateId);
  const duplicateTargets = destinations.filter(
    (d) => d.status !== "inactive" && d._id !== duplicateSource?.location,
  );
  const closeDuplicate = () => {
    setDuplicateId(null);
    setDuplicateTo("");
  };
  const handleDuplicate = async () => {
    if (!duplicateId || !duplicateTo) return;
    setDuplicating(true);
    try {
      const res = await duplicateVehicle(accessToken, duplicateId, duplicateTo);
      toast.success(
        `Copied to ${destinationName(duplicateTo) ?? "the new city"} as a draft. Review price & stock, then publish.`,
      );
      queryClient.invalidateQueries({ queryKey: ["vehicle"] });
      closeDuplicate();
      if (res?.data?._id) router.push(`/admin/vehicle/edit/${res.data._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate vehicle");
    } finally {
      setDuplicating(false);
    }
  };

  // List filters (client-side over the already-loaded list)
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const typeOptions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.vehicleType).filter(Boolean))).sort(),
    [vehicles],
  );
  const cityOptions = useMemo(
    () => destinations.filter((d) => vehicles.some((v) => v.location === d._id)),
    [destinations, vehicles],
  );
  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter(
      (v) =>
        (!q ||
          v.vehicleName?.toLowerCase().includes(q) ||
          v.vehicleBrand?.toLowerCase().includes(q)) &&
        (!cityFilter || v.location === cityFilter) &&
        (!typeFilter || v.vehicleType === typeFilter) &&
        (!statusFilter || v.status === statusFilter),
    );
  }, [vehicles, search, cityFilter, typeFilter, statusFilter]);
  const publishedCount = vehicles.filter((v) => v.status === "published").length;

  if (isError) {
    toast.error(error.message);
    return <h1>{error.message}</h1>;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!res.ok) throw new Error(`Failed to delete  vehicle `);
      toast.success("Vehicle: Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicle"] });
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Something went wrong while deleting");
    }
  };

  if (!permissions.includes("vehicle"))
    return <div className="mx-auto text-2xl">Access Denied</div>;
  return (
    <FleetPage>
      <RentalPageHeader
        title="Vehicles"
        description="Every rental vehicle by city. Duplicate one into another city, edit pricing and stock, and control what's live."
        actions={
          <Button size="sm" className={rPrimaryBtn} onClick={() => router.push("/admin/vehicle/new")}>
            <Plus className="h-3.5 w-3.5" /> Add vehicle
          </Button>
        }
      />

      <FleetKpiStrip
        items={[
          { label: "Total vehicles", value: vehicles.length, icon: Car, tone: "slate" },
          { label: "Published", value: publishedCount, icon: CheckCircle2, tone: "emerald" },
          { label: "Drafts", value: vehicles.length - publishedCount, icon: FilePen, tone: "amber" },
          { label: "Cities", value: cityOptions.length, icon: MapPin, tone: "sky" },
        ]}
      />

      <FleetPanel
        title="All vehicles"
        description={`${filteredVehicles.length} of ${vehicles.length} shown`}
        actions={
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search name or brand"
                className="h-8 w-full pl-8 text-[13px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select aria-label="Filter by city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={fleetSelectClass}>
              <option value="">All cities</option>
              {cityOptions.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            <select aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={fleetSelectClass}>
              <option value="">All types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fleetSelectClass}>
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <VehiclesList
            vehicles={filteredVehicles.map((b) => ({
              _id: b._id,
              vehicleName: b.vehicleName,
              vehicleType: b.vehicleType,
              fuelType: b.fuelType,
              price: b.price,
              status: b.status,
              locationName: destinationName(b.location),
              vehicleBrand: b.vehicleBrand,
            }))}
            onStatusChange={(id) => {
              router.push(`/admin/vehicle/edit/${id}`);
            }}
            onDelete={handleDelete}
            onDuplicate={(id) => setDuplicateId(id)}
            onPreview={(id) => setPreviewId(id)}
          />
        )}
      </FleetPanel>

      <Dialog open={!!duplicateId} onOpenChange={(open) => !open && closeDuplicate()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-[#FE5300]" />
              Duplicate to another city
            </DialogTitle>
            <DialogDescription>
              Copies <span className="font-semibold text-slate-700">{duplicateSource?.vehicleName}</span>
              {destinationName(duplicateSource?.location) ? ` (${destinationName(duplicateSource?.location)})` : ""}
              {" "}with all its details into the city you choose, as a <span className="font-semibold">draft</span>.
              Nothing goes live until you review it and publish.
            </DialogDescription>
          </DialogHeader>

          <label className="text-sm font-medium text-slate-700" htmlFor="duplicate-city">
            New city
          </label>
          <select
            id="duplicate-city"
            value={duplicateTo}
            onChange={(e) => setDuplicateTo(e.target.value)}
            className={`${fleetSelectClass} w-full`}
          >
            <option value="" disabled>
              {duplicateTargets.length ? "Select a city" : "No other active city available"}
            </option>
            {duplicateTargets.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} {d.city ? `(${d.city})` : ""}
              </option>
            ))}
          </select>

          <DialogFooter>
            <Button variant="outline" onClick={closeDuplicate} disabled={duplicating}>
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={!duplicateTo || duplicating}
              className="bg-[#FE5300] hover:bg-[#e14a00]"
            >
              {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Duplicate as draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VehiclePreviewDrawer id={previewId} isOpen={!!previewId} onClose={() => setPreviewId(null)} />
    </FleetPage>
  );
}

export default VehiclePage;
