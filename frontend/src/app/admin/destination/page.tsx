"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // or any toast library
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import DestinationList from "@/components/admin/DestinationList";

interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  coverImage: string;
  slug: string;
}

export default function DestinationPage() {
  const token = useAuthStore((state) => state.accessToken);
  const permissions = useAuthStore((state) => state.permissions) as string[];
  const [destination, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ Fetch blogs
  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/destination`, // adjust API route
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.success) {
        setDestinations(data.data);
      } else {
        toast.error(data.message || "Failed to fetch Destinations");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong fetching Destinations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  // ✅ Edit
  const handleEdit = (id: string) => {
    router.push(`/admin/destination/edit/${id}`);
  };

  // ✅ Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this destination?")) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/destination/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Destination deleted successfully");
        fetchDestinations(); // refetch after delete
      } else {
        toast.error(data.message || "Failed to delete destination");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while deleting destination");
    }
  };

  if (!permissions.includes("destination"))
    return <h1 className="text-2xl font-bold">Access Denied</h1>;
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Destinations</h1>
        <button
          onClick={() => router.push("/admin/destination/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DestinationList
          destinations={destination.map((b) => ({
            id: b._id,
            name: b.name,
            country: b.country,
            state: b.state,
            url: `/${b.country}/${b.state}/`, // or absolute link if needed
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
