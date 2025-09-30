"use client";
import React from 'react'
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';   
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react'; 
import PageList from '@/components/admin/PageList';
interface WebPage {
    title: string;
    content: string;
    _id: string;
    slug: string
    status: string
    parent: string
  }
interface QueryResponse {
    data: WebPage[];
    total: number;
    page: number;
    totalPages: number;
}
const getAllWebPage = async (accessToken: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage`, {
        method: "GET",
        headers:{
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        }
    })
    if(!res.ok) throw new Error("Failed to fetch webpages");
    const data=await res.json();
    return data; 
}
function WebPage() {
    const accessToken = useAuthStore((state) => state.accessToken) as string;
    const router= useRouter();

    const { data, isLoading, isError, error } = useQuery<QueryResponse>({
        queryKey: ["webpage"],
        queryFn: () => getAllWebPage(accessToken),
        retry: 2,
    })
    const webpages= data?.data ?? [];

    const handleEdit = (id: string) => {
        router.push(`/admin/webpage/edit/${id}`);
    };
    const handleDelete = async (id: string) => {
        if(!confirm("Are you sure you want to delete this webpage?"))return
        try {
            const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage/${id}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            })
            if(!res.ok) throw new Error("Failed to delete webpage");
            toast.success("Webpage: Deleted successfully");
            router.refresh();
         } catch (error) {
            console.log("error in deleting", error);
            toast.error("Failed to delete webpage");
         }
    }
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All WebPages</h1>
        <button
          onClick={() => router.push("/admin/webpage/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create
        </button>
      </div>
       
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PageList
          webpages={webpages.map((b) => ({
            id: b._id,
            title: b.title,
            status: b.status === "published"? "Published": "Draft",
            parent: b.parent,
            url: `/${b.parent}/${b.slug}`, 
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      {isError && toast.error(error.message)}
    </div>
  )
}

export default WebPage