"use client"
import React, { useState } from 'react'
import { useQuery , useQueryClient } from '@tanstack/react-query';
import {Loader2} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import UsersList from '@/components/admin/UsersList';
interface User{
    _id: string;
    name: string;
    email: string;
    role: string;
    avatar: {
      url: string;
      public_id: string;
      alt: string;
    };
    isActive: boolean;
}

interface QueryResponse{
    success: boolean;
    message: string;
    data: User[];
}
const getAllUsers= async(email:string,accessToken:string)=>{
    const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/getAllUsers/?email=${email}`,{
        method:"GET",
        headers:{"Content-Type":"application/json",
        Authorization: `Bearer ${accessToken}`},
    });
    if(!res.ok) throw new Error("Failed to fetch authors");
    const data=await res.json();
    return data;
}
function UsersPage() {
       const [email, setEmail] = useState("");
       const [searchEmail, setSearchEmail] = useState("");
       const queryClient = useQueryClient();
    const accessToken = useAuthStore((state) => state.accessToken) as string;


   const { data, isLoading, isError, error, refetch} = useQuery<QueryResponse>({
     queryKey: ["users" , searchEmail],
     queryFn:()=> getAllUsers(searchEmail,accessToken),
     retry: 2,
   })
   if(isError){
    toast.error(error.message);
    return <h1>{error.message}</h1>
   }
const users= data?.data ?? [];
   const  handleEdit = async(id: string , role: string) => {
    try {
        const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/changeRole/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ role }),
        })
        if(!res.ok) throw new Error("Failed to update role");
        toast.success("Role updated successfully");
         queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
        toast.error("Something went wrong while updating role");
        console.log("error in updating role", error);
    }
   };
   const  handleDelete = async (id: string) => {
     try {
        const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/blockUser/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
        if(!res.ok) throw new Error("Failed to block user");
        toast.success("User: Blocked successfully");
        queryClient.invalidateQueries({ queryKey: ["users"] });
     } catch (error) {
        console.log("error in deleting", error);
        toast.error("Something went wrong while blocking user");
     }
   }
 const handleChange=(e: React.ChangeEvent<HTMLInputElement>)=>{
    setEmail(e.target.value);
 }
   const handleSearch = () => {
    setSearchEmail(email);
    refetch(); 
  };
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Users</h1>
        <div className='flex gap-4 items-center'>
            <input type="text" placeholder='user@gmail.com' className='border border-gray-300 px-4 py-2 rounded-lg' value={email} onChange={handleChange}/>
          <button
          onClick={ handleSearch}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
           Search
          </button>
        </div>

      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <UsersList
          users={users.map((b) => ({
            id: b._id,
            name: b.name,
            email: b.email,
            role: b.role,
            isActive: b.isActive, 
          }))}
          onStatusChange={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default UsersPage