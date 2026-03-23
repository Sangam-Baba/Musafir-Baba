"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import EditProfile from "@/components/User/EditProfile";
import { Edit, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserInterface {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  address: string;
  avatar: {
    url: string;
    public_id: string;
    alt: string;
  };
  country: string;
  state: string;
  city: string;
  zipcode: string;
  createdAt: string;
  updatedAt: string;
}

const getProfile = async (token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load profile");
  }

  return res.json();
};

export default function UserProfilePage() {
  const token = useAuthStore((state) => state.accessToken) as string;
  const [openModel, setOpenModel] = React.useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => getProfile(token),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto mt-10 px-4">
        <Skeleton className="h-10 w-48 mb-6" />
        <Card className="rounded-lg">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <Skeleton className="h-32 w-32 rounded-full mx-auto md:mx-0" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10 px-4">
        <Card className="rounded-lg border-destructive">
          <CardContent className="p-8 text-center">
            <p className="text-destructive">
              Failed to load profile. Please login again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const user: UserInterface = data?.data;

  return (
    <div className="max-w-5xl mx-auto pb-16 pt-4 px-4 sm:px-6">
      {/* Profile Header Image / Gradient Banner */}
      <div className="h-48 md:h-64 w-full bg-gradient-to-r from-orange-500 to-orange-400 dark:from-orange-600 dark:to-orange-500 rounded-3xl relative shadow-md">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
        </div>
        
        {/* Edit Action Button */}
        <div className="absolute top-4 right-4 z-10">
            <Button
              onClick={() => setOpenModel(true)}
              className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shadow-sm transition-all"
              variant="outline"
              size="sm"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Profile</span>
            </Button>
        </div>
      </div>

      {/* Main Profile Info Section (Avatar + Actions) */}
      <div className="relative -mt-16 sm:-mt-20 px-4 sm:px-8 flex flex-col sm:flex-row gap-6 sm:items-end justify-between mb-8">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-end w-full">
          {/* Avatar overlapping the banner */}
          <div className="relative group shrink-0 z-10 inline-block">
             <div className="absolute -inset-2 bg-background rounded-full"></div>
             <Image
                src={user?.avatar?.url || "/avatar.png"}
                alt={user?.avatar?.alt || "User avatar"}
                width={160}
                height={160}
                className="relative rounded-full ring-4 ring-background object-cover shadow-sm bg-muted h-[120px] w-[120px] sm:h-[160px] sm:w-[160px]"
             />
          </div>
          
          <div className="flex-1 pb-2 sm:pb-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">{user?.name}</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1.5 ">
               <Mail className="w-4 h-4 text-primary" /> {user?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 space-y-8">
        {/* Badges Section */}
        <div className="flex items-center gap-3 flex-wrap bg-muted/30 p-4 rounded-2xl border border-border/50">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm uppercase tracking-widest font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors">
              {user?.role || "USER"}
            </Badge>
            {user?.createdAt && (
               <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium">
                  <Calendar className="h-4 w-4 text-orange-500/70" />
                  Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
               </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Contact Info Card */}
           <Card className="shadow-sm border-border/40 hover:shadow-md transition-shadow bg-card h-full">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20 rounded-t-xl">
                <CardTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
                   <Phone className="w-5 h-5 text-blue-500" />
                   Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                 <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Phone Number</h4>
                    <p className="font-semibold text-lg text-foreground">{user?.phone || "Not provided"}</p>
                 </div>
                 <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Primary Email</h4>
                    <p className="font-semibold text-lg text-foreground truncate">{user?.email || "Not provided"}</p>
                 </div>
              </CardContent>
           </Card>

           {/* Location Info Card */}
           <Card className="shadow-sm border-border/40 hover:shadow-md transition-shadow bg-card h-full">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20 rounded-t-xl">
                <CardTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
                   <MapPin className="w-5 h-5 text-emerald-500" />
                   Location Address
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                 {user?.address || user?.city || user?.state || user?.country ? (
                   <>
                     <div>
                        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Street Address</h4>
                        <p className="font-semibold text-base text-foreground leading-relaxed">{user?.address || "—"}</p>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                       <div>
                          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">City / State</h4>
                          <p className="font-semibold text-base text-foreground capitalize">
                            {[user?.city, user?.state].filter(Boolean).join(", ") || "—"}
                          </p>
                       </div>
                       <div>
                          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Country / Zip</h4>
                          <p className="font-semibold text-base text-foreground capitalize">
                            {user?.country || "—"} {user?.zipcode ? `(${user.zipcode})` : ""}
                          </p>
                       </div>
                     </div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/60">
                      <MapPin className="w-10 h-10 mb-3 text-muted-foreground/30" />
                      <p className="font-medium text-sm">No address information provided.</p>
                      <Button variant="link" className="text-primary mt-1 p-0 h-auto font-semibold" onClick={() => setOpenModel(true)}>Add your address</Button>
                   </div>
                 )}
              </CardContent>
           </Card>
        </div>
      </div>

      {openModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <EditProfile id={user?._id} onClose={() => setOpenModel(false)} />
        </div>
      )}
    </div>
  );
}
