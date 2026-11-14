import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import RentalPageClient from "@/app/(user)/rental/[location]/[vehicleType]/[slug]/pageClient";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";

// Admin preview of a rental vehicle page, same idea as PreviewDrawer for
// packages: loads the vehicle by id (drafts too) and renders the real public
// page component inside a side drawer. Read-only: it only GETs data.
// The admin "by id" endpoint returns ids for the pickup city and the author,
// so both are looked up here the same way the public page shows them
// (no author selected → Abhishek Rai, like the backend does for the live page).
export default function VehiclePreviewDrawer({
  id,
  isOpen,
  onClose,
}: {
  id: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const accessToken = useAdminAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!id || !isOpen) return;
    const load = async () => {
      setLoading(true);
      setVehicle(null);
      try {
        const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
        const [vehicleRes, citiesRes, authorsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/${id}`, { headers: authHeaders }),
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination`, { headers: authHeaders }),
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/authors`),
        ]);
        const vehicleData = await vehicleRes.json();
        if (!vehicleData?.success || !vehicleData.data) return;
        const raw = vehicleData.data;
        const cities: any[] = citiesRes.ok ? (await citiesRes.json())?.data || [] : [];
        const authors: any[] = authorsRes.ok ? (await authorsRes.json())?.data || [] : [];

        const locationId = typeof raw.location === "object" && raw.location ? raw.location._id : raw.location;
        const location =
          (typeof raw.location === "object" && raw.location?.name ? raw.location : null) ||
          cities.find((c) => String(c._id) === String(locationId)) ||
          { _id: locationId || "", name: "Preview", slug: "", state: "", country: "" };

        const authorId = typeof raw.author === "object" && raw.author ? raw.author._id : raw.author;
        const author =
          (typeof raw.author === "object" && raw.author?.name ? raw.author : null) ||
          authors.find((a) => String(a._id) === String(authorId)) ||
          authors.find((a) => /Abhishek Rai/i.test(a?.name || "")) ||
          undefined;

        setVehicle({ ...raw, location, author });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isOpen, accessToken]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[90vw] sm:max-w-[90vw] overflow-y-auto p-0 bg-slate-50">
        <SheetHeader className="p-4 bg-white border-b sticky top-0 z-50">
          <SheetTitle>
            Vehicle Preview {vehicle?.status === "draft" ? "(Draft — not on the website yet)" : ""}
          </SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="p-8">
            <Loader size="lg" message="Loading preview..." />
          </div>
        ) : vehicle ? (
          <div className="w-full relative z-0">
            <RentalPageClient vehicle={vehicle} relatedVehicles={[]} />
          </div>
        ) : (
          <div className="p-4 text-center mt-10">Failed to load vehicle data.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
