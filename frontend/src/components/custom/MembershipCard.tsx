"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { CircleCheckBig, CircleX } from "lucide-react";
import { Loader } from "./loader";
import { Button } from "../ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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

const bookMembership = async (id: string, accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/membershipbooking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ membershipId: id }),
    }
  );
  if (!res.ok) throw new Error("Failed to book membership");
  return res
    .json()
    .then((data) => {
      return data;
    })
    .catch((error) => {
      return error;
    });
};
function MembershipCard() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const router = useRouter();
  const { data, isLoading, isError, error } = useQuery<Membership[]>({
    queryKey: ["membership"],
    queryFn: getMembership,
  });
  const muttation = useMutation({
    mutationFn: (id: string) => bookMembership(id, accessToken),
    onSuccess: (data) => {
      console.log(data);
      toast.success("Membership Booked Successfully");
      router.push(`/membership/${data.data._id}`);
    },
    onError: (error) => {
      console.log(error);
      toast.error("Failed to book membership");
    },
  });

  const handleSubmit = (id: string) => {
    if (!accessToken) {
      router.push("/login");
    }
    muttation.mutate(id);
  };

  if (isLoading) return <Loader size="lg" message="Loading membership..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data?.map((membership: Membership, idx: number) => (
        <Card key={idx} className="mt-8 ">
          <CardHeader>
            <CardTitle className="flex flex-col items-center justify-center gap-2">
              <p>{membership.name}</p>
              <p>₹{membership.price}</p>
              <p>
                {membership.duration.charAt(0).toUpperCase() +
                  membership.duration.slice(1)}
              </p>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {membership.include?.map((include, i: number) => (
                <li
                  key={i}
                  className="flex justify-between p-3 border rounded-lg"
                >
                  <CircleCheckBig color="green" />
                  {include.item}
                </li>
              ))}
              {membership.exclude?.map((exclude, i: number) => (
                <li
                  key={i}
                  className="flex justify-between p-3 border rounded-lg"
                >
                  <CircleX color="red" />
                  {exclude.item}
                </li>
              ))}
            </ul>
            <Button
              className="w-full mt-4"
              onClick={() => handleSubmit(membership._id)}
            >
              Buy Now
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default MembershipCard;
