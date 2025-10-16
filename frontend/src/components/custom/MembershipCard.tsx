"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { CircleCheckBig, CircleX } from "lucide-react";
import { Loader } from "./loader";
import { Button } from "../ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
interface Membership {
  _id: string;
  name: string;
  price: number;
  duration: string;
  include: [{ item: string }];
  exclude: [{ item: string }];
  isActive: boolean;
  slug: string;
}
const getMembership = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/membership`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to get membership");
  const data = await res.json();
  return data?.data;
};

function MembershipCard() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const router = useRouter();
  const { data, isLoading, isError, error } = useQuery<Membership[]>({
    queryKey: ["membership"],
    queryFn: getMembership,
  });

  const handleSubmit = (id: string) => {
    if (!accessToken) {
      useAuthDialogStore
        .getState()
        .openDialog("login", undefined, `/membership/${id}`);
      return;
      // router.push("/auth/login");
    }
    router.push(`/membership/${id}`);
  };

  if (isLoading) return <Loader size="lg" message="Loading membership..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data?.map((membership: Membership, idx: number) => (
        <Card key={idx} className="mt-8 h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex flex-col items-center justify-center gap-2">
              <p className="text-2xl text-center font-semibold">
                {membership.name}
              </p>
              <p className="text-xl text-[#FE5300]">₹{membership.price}</p>
              <p>
                {membership.duration.charAt(0).toUpperCase() +
                  membership.duration.slice(1)}
              </p>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-1">
            <ul className=" flex-1">
              {membership.include?.map((include, i: number) => (
                <li key={i} className="flex p-3  rounded-lg gap-1">
                  <CircleCheckBig color="green" className="w-[10%]" />
                  <p className="w-[90%]">{include.item}</p>
                </li>
              ))}
              {membership.exclude?.map((exclude, i: number) => (
                <li key={i} className="flex p-3  rounded-lg gap-1">
                  <CircleX color="red" className="w-[10%]" />
                  <p className="w-[90%]">{exclude.item}</p>
                </li>
              ))}
            </ul>
          </CardContent>
          <div className="p-2 ">
            <Button
              className="w-full bg-[#FE5300]"
              onClick={() => handleSubmit(membership._id)}
            >
              Buy Now
            </Button>
          </div>
        </Card>
      ))}
      <AuthDialog />
    </div>
  );
}

export default MembershipCard;
