"use client";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

interface Batch {
  name: string;
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
  status: string;
}

const createBatch = async (accessToken: string, form: Batch) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Batch creation failed");
  return res.json();
};

const updateBatch = async (accessToken: string, id: string, form: Batch) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/batch/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Batch update failed");
  return res.json();
};

const getBatch = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/batch/id/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch batch");
  return res.json();
};

export const CreateBatchModal = ({
  onBatchCreated,
  onBatchUpdated,
  onClose,
  existingBatch,
}: {
  onBatchCreated: (batchId: string) => void;
  onBatchUpdated: (batchId: string) => void;
  onClose: () => void;
  existingBatch: string | null;
}) => {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;

  const [form, setForm] = useState<Batch>({
    name: "",
    startDate: "",
    endDate: "",
    quad: 0,
    triple: 0,
    double: 0,
    child: 0,
    quadDiscount: 0,
    tripleDiscount: 0,
    doubleDiscount: 0,
    childDiscount: 0,
    status: "upcoming",
  });

  const { data } = useQuery({
    queryKey: ["batches", existingBatch],
    queryFn: () => getBatch(accessToken, existingBatch as string),
    enabled: !!existingBatch,
  });

  const batch = data?.data;
  useEffect(() => {
    if (existingBatch && batch) {
      setForm({
        name: batch.name || "",
        startDate: batch.startDate?.split("T")[0] || "",
        endDate: batch.endDate?.split("T")[0] || "",
        quad: batch.quad || 0,
        triple: batch.triple || 0,
        double: batch.double || 0,
        child: batch.child || 0,
        quadDiscount: batch.quadDiscount || 0,
        tripleDiscount: batch.tripleDiscount || 0,
        doubleDiscount: batch.doubleDiscount || 0,
        childDiscount: batch.childDiscount || 0,
        status: batch.status || "upcoming",
      });
    }
  }, [existingBatch, batch]);

  const mutation = useMutation({
    mutationFn: () =>
      existingBatch
        ? updateBatch(accessToken, existingBatch, form)
        : createBatch(accessToken, form),
    onSuccess: (res) => {
      toast.success(
        existingBatch
          ? "Batch updated successfully!"
          : "Batch created successfully!"
      );
      if (existingBatch) onBatchUpdated?.(existingBatch);
      else onBatchCreated(res?.data?._id || res?._id);
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to create batch"),
  });

  const handleChange = (key: keyof Batch, value: string) => {
    if (
      [
        "quad",
        "triple",
        "double",
        "child",
        "quadDiscount",
        "tripleDiscount",
        "doubleDiscount",
        "childDiscount",
      ].includes(key)
    )
      setForm((prev) => ({ ...prev, [key]: Number(value) }));
    else setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div
      className="bg-white rounded-xl shadow-2xl w-[420px] max-h-[90vh] overflow-y-auto p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
        {existingBatch ? "Update Batch" : "Create Batch"}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Basic Info */}
        <div className="space-y-2">
          <label className="text-gray-600 font-medium">Batch Name</label>
          <input
            type="text"
            placeholder="Enter batch name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-600 font-medium">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
              className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
              required
            />
          </div>
          <div>
            <label className="text-gray-600 font-medium">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
              required
            />
          </div>
        </div>

        {/* Price Section */}
        <div className="border-t pt-4 mt-2">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Pricing Details
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {[
              ["Quad", "quad", "quadDiscount"],
              ["Triple", "triple", "tripleDiscount"],
              ["Double", "double", "doubleDiscount"],
              ["Child", "child", "childDiscount"],
            ].map(([label, priceKey, fakePriceKey]) => (
              <div key={label} className="col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 text-sm">{label} Price</label>
                  <input
                    type="number"
                    value={form[priceKey as keyof Batch]}
                    onChange={(e) =>
                      handleChange(priceKey as keyof Batch, e.target.value)
                    }
                    className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-600 text-sm">{label} Fake</label>
                  <input
                    type="number"
                    value={form[fakePriceKey as keyof Batch]}
                    onChange={(e) =>
                      handleChange(fakePriceKey as keyof Batch, e.target.value)
                    }
                    className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="mt-2">
          <label className="text-gray-600 font-medium">Batch Status</label>
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
          >
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition disabled:opacity-50"
          >
            {mutation.isPending
              ? existingBatch
                ? "Updating..."
                : "Creating..."
              : existingBatch
              ? "Update Batch"
              : "Create Batch"}
          </button>
        </div>
      </form>
    </div>
  );
};
