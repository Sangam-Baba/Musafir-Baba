import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import CustomizedPackageClient from "@/app/(user)/holidays/customised-tour-packages/[destination]/[pkgSlug]/pageClient";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";

export default function CustomizedPreviewDrawer({ id, isOpen, onClose }: { id: string | null; isOpen: boolean; onClose: () => void }) {
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const accessToken = useAdminAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!id || !isOpen) return;
    const fetchPkg = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          const rawPkg = data.data;
          const mergedPkg = rawPkg.pendingUpdates?.data ? { ...rawPkg, ...rawPkg.pendingUpdates.data } : rawPkg;
          
          if (!mergedPkg.destination || !mergedPkg.destination.state) {
            mergedPkg.destination = { ...mergedPkg.destination, state: "Preview" };
          }
          
          setPkg(mergedPkg);
        }
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPkg();
  }, [id, isOpen, accessToken]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[90vw] sm:max-w-[90vw] overflow-y-auto p-0 bg-slate-50">
        <SheetHeader className="p-4 bg-white border-b sticky top-0 z-50">
          <SheetTitle>Customized Package Preview {pkg?.pendingUpdates ? "(Showing Pending Updates)" : ""}</SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="p-8">
            <Loader size="lg" message="Loading preview..." />
          </div>
        ) : pkg ? (
          <div className="w-full relative z-0">
            <CustomizedPackageClient pkg={pkg} relatedPackages={[]} />
          </div>
        ) : (
          <div className="p-4 text-center mt-10">Failed to load package data.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
