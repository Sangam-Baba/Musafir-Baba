"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Calendar, DollarSign, IndianRupee, Tag, X } from "lucide-react";

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
      className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-border"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {existingBatch ? "Update Batch" : "Create New Batch"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {existingBatch
                ? "Modify batch details and pricing"
                : "Set up a new batch with pricing details"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Batch Name
              </label>
              <input
                type="text"
                placeholder="e.g., Summer 2024 Batch"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  End Date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <IndianRupee className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                Pricing Configuration
              </h3>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: "Quad",
                  priceKey: "quad",
                  discountKey: "quadDiscount",
                },
                {
                  label: "Triple",
                  priceKey: "triple",
                  discountKey: "tripleDiscount",
                },
                {
                  label: "Double",
                  priceKey: "double",
                  discountKey: "doubleDiscount",
                },
                {
                  label: "Child",
                  priceKey: "child",
                  discountKey: "childDiscount",
                },
              ].map(({ label, priceKey, discountKey }) => (
                <div
                  key={label}
                  className="bg-muted/30 rounded-lg p-4 border border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">
                      {label} Occupancy
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Regular Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={form[priceKey as keyof Batch]}
                          onChange={(e) =>
                            handleChange(
                              priceKey as keyof Batch,
                              e.target.value
                            )
                          }
                          className="w-full pl-7 pr-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Display Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={form[discountKey as keyof Batch]}
                          onChange={(e) =>
                            handleChange(
                              discountKey as keyof Batch,
                              e.target.value
                            )
                          }
                          className="w-full pl-7 pr-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Batch Status
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="px-5 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};
