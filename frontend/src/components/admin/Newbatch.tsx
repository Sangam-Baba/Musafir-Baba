"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Calendar as CalendarIcon, IndianRupee, Tag, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, parseISO } from "date-fns";

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

const createBatch = async (accessToken: string, form: Batch | Batch[]) => {
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

const SimpleCalendar = ({ selectedDates, onSelectDate }: { selectedDates: Date[], onSelectDate: (d: Date) => void }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  });

  const handleToggle = (d: Date) => {
    onSelectDate(d);
  };

  return (
    <div className="w-full bg-background rounded-md border border-input p-3 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><ChevronLeft className="w-4 h-4"/></button>
        <span className="text-sm font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</span>
        <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><ChevronRight className="w-4 h-4"/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => <div key={day} className="text-[10px] uppercase font-bold text-muted-foreground">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isSelected = selectedDates.some(sd => isSameDay(sd, day));
          const isCurrentMonth = isSameMonth(day, currentMonth);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleToggle(day)}
              className={`h-8 w-full rounded-md flex items-center justify-center text-xs transition-colors font-medium
                ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}
                ${!isCurrentMonth && !isSelected ? 'text-muted-foreground/40' : !isSelected ? 'text-foreground' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  );
};

export const CreateBatchModal = ({
  onBatchCreated,
  onBatchUpdated,
  onClose,
  existingBatch,
  packageDuration = 0,
}: {
  onBatchCreated: (batchId: string | string[]) => void;
  onBatchUpdated: (batchId: string) => void;
  onClose: () => void;
  existingBatch: string | null;
  packageDuration?: number;
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

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

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
      if (batch.startDate) {
        setSelectedDates([parseISO(batch.startDate)]);
      }
    }
  }, [existingBatch, batch]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (existingBatch) {
        return updateBatch(accessToken, existingBatch, form);
      } else {
        if (selectedDates.length === 0) throw new Error("Please select at least one start date.");
        const durationOffset = Math.max(0, packageDuration - 1);
        const batchesPayload = selectedDates.map((date, index) => {
          const startDateStr = format(date, 'yyyy-MM-dd');
          const endDateStr = format(addDays(date, durationOffset), 'yyyy-MM-dd');
          
          let finalName = form.name?.trim();
          if (!finalName) {
            // Auto-generate MBT standard serial
            finalName = `MBT${Math.floor(100000 + Math.random() * 900000)}`;
          } else if (selectedDates.length > 1) {
            // Append serial if custom name provided for bulk
            finalName = `${finalName}-${index + 1}`;
          }

          return { ...form, name: finalName, startDate: startDateStr, endDate: endDateStr };
        });
        return createBatch(accessToken, batchesPayload);
      }
    },
    onSuccess: (res) => {
      toast.success(
        existingBatch
          ? "Batch updated successfully!"
          : `${selectedDates.length} Batch(es) created successfully!`
      );
      if (existingBatch) {
        onBatchUpdated?.(existingBatch);
      } else {
        const data = res?.data;
        const ids = Array.isArray(data) ? data.map(r => r?._id) : [data?._id];
        onBatchCreated(ids);
      }
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to create batch(es)"),
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDates(prev => {
      const exists = prev.some(d => isSameDay(d, date));
      if (exists) return prev.filter(d => !isSameDay(d, date));
      return [...prev, date];
    });
  };

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
    if (!existingBatch && selectedDates.length === 0) {
      toast.error("Please select at least one start date.");
      return;
    }
    // Note: We removed the strict 'name' check here because mutationFn 
    // now auto-generates a name if it's empty, ensuring it won't fail the backend.
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
              {existingBatch ? "Update Batch" : "Create New Batch(es)"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {existingBatch
                ? "Modify batch details and pricing"
                : "Select multiple start dates to create bulk batches"}
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
                Batch Name <span className="text-[10px] text-muted-foreground ml-2 font-normal">(Leave blank to auto-generate)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Summer 2024 Batch (Optional)"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                required={!!existingBatch}
              />
            </div>

            {existingBatch ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      handleChange("startDate", newStartDate);
                      if (newStartDate && packageDuration) {
                        const durationOffset = Math.max(0, packageDuration - 1);
                        const newEndDate = format(addDays(parseISO(newStartDate), durationOffset), 'yyyy-MM-dd');
                        handleChange("endDate", newEndDate);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    End Date
                  </label>
                  <input
                    type="date"
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    Select Start Dates
                  </label>
                  <div className="text-xs text-muted-foreground">
                    End Dates auto-calculated (+{Math.max(0, packageDuration - 1)} days)
                  </div>
                </div>
                <SimpleCalendar selectedDates={selectedDates} onSelectDate={handleDateSelect} />
                {selectedDates.length > 0 && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                    Selected {selectedDates.length} start date(s): {selectedDates.map(d => format(d, 'MMM d')).join(', ')}
                  </div>
                )}
              </div>
            )}
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
            : "Create Batch(es)"}
        </button>
      </div>
    </div>
  );
};
