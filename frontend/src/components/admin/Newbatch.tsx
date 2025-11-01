"use client";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Batch creation failed");
  }

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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Batch update failed");
  }

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Batch update failed");
  }
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
  const accessToken = useAuthStore((state) => state.accessToken) as string;

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
      else {
        const id = res?.data?._id || res?._id;
        if (id) onBatchCreated(id);
      }
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create batch");
    },
  });

  const handleChange = (key: keyof Batch, value: string) => {
    // convert numeric inputs to numbers
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
      className="bg-white rounded-xl shadow-xl p-6 w-[400px]"
      onClick={(e) => e.stopPropagation()} // ✅ prevent overlay click bubbling
    >
      <h2 className="text-xl font-semibold text-center mb-4">Create Batch</h2>
      <form
        // onSubmit={handleSubmit}
        className="flex flex-col gap-4 p-4 bg-white rounded-md shadow-md"
      >
        <input
          type="text"
          placeholder="Batch Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          required
          className="border p-2 rounded-md"
        />

        <input
          type="date"
          value={form.startDate}
          onChange={(e) => handleChange("startDate", e.target.value)}
          required
          className="border p-2 rounded-md"
        />

        <input
          type="date"
          value={form.endDate}
          onChange={(e) => handleChange("endDate", e.target.value)}
          required
          className="border p-2 rounded-md"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Quad"
            value={form.quad}
            onChange={(e) => handleChange("quad", e.target.value)}
            required
            className="border p-2 rounded-md"
          />
          <input
            type="number"
            placeholder="Quad Discount"
            value={form.quadDiscount}
            onChange={(e) => handleChange("quadDiscount", e.target.value)}
            className="border p-2 rounded-md"
          />

          <input
            type="number"
            placeholder="Triple"
            value={form.triple}
            onChange={(e) => handleChange("triple", e.target.value)}
            required
            className="border p-2 rounded-md"
          />
          <input
            type="number"
            placeholder="Triple Discount"
            value={form.tripleDiscount}
            onChange={(e) => handleChange("tripleDiscount", e.target.value)}
            className="border p-2 rounded-md"
          />

          <input
            type="number"
            placeholder="Double"
            value={form.double}
            onChange={(e) => handleChange("double", e.target.value)}
            required
            className="border p-2 rounded-md"
          />
          <input
            type="number"
            placeholder="Double Discount"
            value={form.doubleDiscount}
            onChange={(e) => handleChange("doubleDiscount", e.target.value)}
            className="border p-2 rounded-md"
          />

          <input
            type="number"
            placeholder="Child"
            value={form.child}
            onChange={(e) => handleChange("child", e.target.value)}
            required
            className="border p-2 rounded-md"
          />
          <input
            type="number"
            placeholder="Child Discount"
            value={form.childDiscount}
            onChange={(e) => handleChange("childDiscount", e.target.value)}
            className="border p-2 rounded-md"
          />
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="border p-2 rounded-md"
          >
            <option value="" disabled>
              Select Status
            </option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-md mt-2"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? existingBatch
              ? "Updating..."
              : "Creating..."
            : existingBatch
            ? "Update Batch"
            : "Create Batch"}
        </button>
        <button
          type="button"
          className="flex-1 border border-gray-300 py-2 rounded-md"
          onClick={onClose}
        >
          Close
        </button>
      </form>
    </div>
  );
};
