"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { CreateEditRentalSpecialPage } from "@/components/admin/CreateEditRentalSpecialPage";

// Content of /rental/{special-type}: the type's own page (a special page with
// an empty permalink). Opens it for editing, or a new one if there is none yet.

interface PageRow {
  _id: string;
  slug?: string;
  specialType?: { _id: string } | null;
}

export default function SpecialTypeContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const { data, isLoading } = useQuery<{ data: PageRow[] }>({
    queryKey: ["rental-special-page"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/rental-special/pages`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Request failed");
      return body;
    },
  });

  if (isLoading) return <Loader size="lg" />;
  const existing = (data?.data ?? []).find((p) => p.specialType?._id === id && !p.slug);
  return <CreateEditRentalSpecialPage key={existing?._id ?? "new"} id={existing?._id ?? null} landingFor={id} />;
}
