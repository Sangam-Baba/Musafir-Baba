"use client"
import React from 'react'
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {Loader2} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import  AuthorsList from '@/components/admin/AuthorsList'
interface Author{
    _id: string;
    name: string;
    email: string;
    about: string;
    role: string;
    avatar: {
      url: string;
      public_id: string;
      alt: string;
    };
    slug: string;
}

interface QueryResponse{
    success: boolean;
    message: string;
    data: Author[];
}
const getAllAuthors= async()=>{
    const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/authors`);
    if(!res.ok) throw new Error("Failed to fetch authors");
    const data=await res.json();
    return data;
}
function AuthorsPage() {
    const accessToken = useAuthStore((state) => state.accessToken);
const router=useRouter();
   const { data, isLoading, isError, error } = useQuery<QueryResponse>({
     queryKey: ["authors"],
     queryFn: getAllAuthors,
     retry: 2,
   })
   if(isError){
    toast.error(error.message);
    return <h1>{error.message}</h1>
   }
const authors= data?.data ?? [];
   const  handleEdit = (id: string) => {
     router.push(`/admin/authors/edit/${id}`);
   };
   const  handleDelete = async (id: string) => {
    if(confirm("Are you sure you want to delete this author?"))return null
     try {
        const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/authors/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
        if(!res.ok) throw new Error("Failed to delete author");
        toast.success("Author: Deleted successfully");
        router.refresh();
     } catch (error) {
        console.log("error in deleting", error);
        toast.error("Something went wrong while deleting author");
     }
   }
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Authors</h1>
        <button
          onClick={() => router.push("/admin/authors/new")}
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
        <AuthorsList
          authors={authors.map((b) => ({
            id: b._id,
            name: b.name,
            slug: b.slug,
            role: b.role,
            url: `/authors/${b.slug}`, 
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default AuthorsPage