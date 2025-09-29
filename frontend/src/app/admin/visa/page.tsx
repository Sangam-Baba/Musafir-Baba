"use client"
import React from 'react'
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {Loader2} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import VisaList from '@/components/admin/VisaList';
interface Visa{
    _id: string;
    country: string;
    cost: number;
    visaType: string;
    childUrl: string;
}

interface QueryResponse{
    success: boolean;
    data: Visa[];
}
const getAllVisa= async()=>{
    const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa`);
    if(!res.ok) throw new Error("Failed to fetch Visa");
    const data=await res.json();
    return data;
}
function VisaPage() {
    const accessToken = useAuthStore((state) => state.accessToken);
const router=useRouter();
   const { data, isLoading, isError, error } = useQuery<QueryResponse>({
     queryKey: ["visa"],
     queryFn: getAllVisa,
     retry: 2,
   })
   if(isError){
    toast.error(error.message);
    return <h1>{error.message}</h1>
   }
   const visa= data?.data ?? [];

   const  handleEdit = (id: string) => {
     router.push(`/admin/visa/edit/${id}`);
   };
   const  handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this visa?"))return
     try {
        const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
        if(!res.ok) throw new Error("Failed to delete visa");
        toast.success("Visa: Deleted successfully");
        router.refresh();
     } catch (error) {
        console.log("error in deleting", error);
        toast.error("Something went wrong while deleting visa");
     }
   }
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Visa</h1>
        <button
          onClick={() => router.push("/admin/visa/new")}
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
        <VisaList
          visa={visa.map((b) => ({
            id: b._id,
            country: b.country,
            cost: b.cost,
            visaType: b.visaType,
            url: `${b.childUrl}`, 
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default VisaPage