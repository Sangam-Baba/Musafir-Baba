"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <div className="max-w-4xl mx-auto mt-10 px-4 pb-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-balance">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal information and preferences
        </p>
      </div>

      <Card className="rounded-lg shadow-sm border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs font-medium">
              {user?.role?.toUpperCase() || "USER"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenModel(true)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-3 mx-auto md:mx-0">
              <div className="relative">
                <Image
                  src={user?.avatar?.url || "/avatar.png"}
                  alt={user?.avatar?.alt || "User avatar"}
                  width={128}
                  height={128}
                  className="rounded-full ring-4 ring-muted object-cover"
                />
              </div>
            </div>

            <div className="flex-1 space-y-6 w-full">
              <div>
                <h2 className="text-3xl font-semibold">{user?.name}</h2>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h3>
                <div className="grid gap-4">
                  {user?.phone ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{user.phone}</p>
                      </div>
                    </div>
                  ) : null}

                  {(user?.address ||
                    user?.city ||
                    user?.state ||
                    user?.country) && (
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Address</p>
                        <div className="font-medium space-y-1">
                          {user?.address && <p>{user.address}</p>}
                          <p className="text-sm">
                            {[
                              user?.city,
                              user?.state
                                ? user.state.charAt(0).toUpperCase() +
                                  user.state.slice(1)
                                : null,
                              user?.zipcode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {user?.country && (
                            <p className="text-sm">
                              {user.country.charAt(0).toUpperCase() +
                                user.country.slice(1)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {user?.createdAt && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Member since{" "}
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {openModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <EditProfile id={user?._id} onClose={() => setOpenModel(false)} />
        </div>
      )}
    </div>
  );
}
