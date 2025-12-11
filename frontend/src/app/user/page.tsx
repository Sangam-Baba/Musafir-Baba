"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import EditProfile from "@/components/User/EditProfile";
import { Loader } from "@/components/custom/loader";
import { Edit } from "lucide-react";
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
    return <Skeleton className="w-full h-full" />;
  }

  if (error) {
    return (
      <p className="text-center text-red-500 mt-10">
        Failed to load profile. Please login again.
      </p>
    );
  }

  const user: UserInterface = data?.data;

  return (
    <div className="max-w-4xl mx-auto mt-10 px-3 md:px-0">
      <h1 className="text-3xl font-semibold mb-6">My Profile</h1>

      <div className="grid grid-cols-1  gap-6">
        {/* USER PROFILE */}
        <Card className="rounded-2xl shadow-sm border bg-[#87e87f]/80">
          {/* <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader> */}
          <CardContent className="flex flex-col md:flex-row  items-center justify-around ">
            <div className="flex flex-col items-center gap-4">
              <Image
                src={user?.avatar?.url || "/avatar.png"}
                alt={user?.avatar?.alt || "Avatar"}
                width={150}
                height={150}
                className="rounded-full"
              />
              <Edit
                size={15}
                onClick={() => setOpenModel(true)}
                className="cursor-pointer"
              />
              {openModel && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <EditProfile
                    id={user?._id}
                    onClose={() => setOpenModel(false)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-lg font-semibold">{user?.name}</p>
                <p className="text-sm text-gray-800">{user?.email}</p>
              </div>
              <p>
                <span className="font-medium">Phone:</span>{" "}
                {user.phone || "Not added"}
              </p>
              <p>
                <span className="font-medium">Address:</span>{" "}
                {user.address || "Not added"}
              </p>
              <div className="grid grid-cols-2">
                <span className="font-medium">
                  {user?.country
                    ? "Country: " +
                      user.country.charAt(0).toUpperCase() +
                      user.country.slice(1)
                    : ""}
                </span>
                <span className="font-medium">
                  {user.state
                    ? "State: " +
                      user.state.charAt(0).toUpperCase() +
                      user.state.slice(1)
                    : ""}
                </span>
              </div>
              <div className="grid grid-cols-2">
                <span className="font-medium">
                  {" "}
                  {user.zipcode ? "Zipcode: " + user.zipcode : ""}
                </span>
                <span className="font-medium">
                  {" "}
                  {user?.city ? "City: " + user.city : ""}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
