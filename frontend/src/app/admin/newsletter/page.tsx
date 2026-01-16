"use client";
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";

const getAllSubscribers = async (token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/newsletter`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch subscribers");
  }
  const data = await res.json();
  return data.data;
};

const getpreview = async (token: string, type: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/newsletter/get-preview/${type}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch subscribers");
  }
  const data = await res.json();
  return data.data;
};

const sendNewsletter = async (token: string, type: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/newsletter/send-newsletter/${type}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to send newsletter");
  const data = await res.json();
  return data.data;
};

function page() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const [type, setType] = useState("blog");

  const { data, isLoading } = useQuery({
    queryKey: ["newsletter"],
    queryFn: () => getAllSubscribers(accessToken),
  });

  const {
    data: preview,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["get-preview", type],
    queryFn: () => getpreview(accessToken, type),
    enabled: false,
  });
  console.log(preview);

  const mutation = useMutation({
    mutationFn: () => sendNewsletter(accessToken, type),
    onSuccess: () => {
      toast.success("Newsletter sent successfully");
      setType("");
    },
    onError: () => {
      toast.error("Failed to send newsletter");
    },
  });

  const handlePreview = () => {
    if (!type) {
      toast.error("Please select newsletter type");
      return;
    }
    refetchPreview();
  };

  const handleSendNewsletter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate();
  };
  if (isLoading || isLoadingPreview) return <Loader size="md" />;
  if (!permissions.includes("newsletter"))
    return <div className="mx-auto text-2xl">Access Denied</div>;
  return (
    <div className="w-full max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Newsletter Subscribers</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <h2 className="text-lg font-semibold mb-2">
            Subscribers({data?.length})
          </h2>
          <ul>
            {data?.map((subscriber: any) => (
              <li key={subscriber.id} className="mb-2 border-b">
                {subscriber.email}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid-cols-2">
          <h2 className="text-lg font-semibold mb-2">Send Newsletter</h2>
          <form onSubmit={handleSendNewsletter}>
            <div className="mb-4 flex gap-3 justify-between">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                What type of newsletter
              </label>
              <select
                className="border rounded-md p-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="blog">Blog</option>
                <option value="news">News</option>
              </select>
            </div>
            <div className="flex gap-3 justify-between">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Send Newsletter
              </button>
              <button
                type="button"
                onClick={handlePreview}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80"
              >
                Preview Newsletter
              </button>
            </div>
          </form>
          {preview && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Newsletter Preview</h3>

              <iframe
                title="Newsletter Preview"
                className="w-full border rounded-lg"
                style={{ height: "600px" }}
                srcDoc={preview}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default page;
