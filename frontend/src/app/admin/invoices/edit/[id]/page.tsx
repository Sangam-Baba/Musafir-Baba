"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const getInvoice = async (id: string, token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch invoice");
  const data = await res.json();
  return data;
};

export default function EditInvoicePage() {
  const token = useAdminAuthStore((state) => state.accessToken) as string;
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);

  const { data: invoiceData, isLoading: fetching } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id, token),
    enabled: !!token && !!id,
  });

  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    invoiceDate: "",
    dueDate: "",
    taxRate: 0,
    discountAmount: 0,
    notes: "",
  });

  const [items, setItems] = useState([
    { description: "", quantity: 1, price: 0, amount: 0 }
  ]);

  const [totals, setTotals] = useState({
    subTotal: 0,
    taxAmount: 0,
    totalAmount: 0,
  });

  // Populate form on load
  useEffect(() => {
    if (invoiceData?.data) {
      const inv = invoiceData.data;
      setFormData({
        clientName: inv.clientName || "",
        clientEmail: inv.clientEmail || "",
        clientPhone: inv.clientPhone || "",
        clientAddress: inv.clientAddress || "",
        invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split("T")[0] : "",
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "",
        taxRate: inv.taxRate || 0,
        discountAmount: inv.discountAmount || 0,
        notes: inv.notes || "",
      });
      setItems(inv.items || [{ description: "", quantity: 1, price: 0, amount: 0 }]);
    }
  }, [invoiceData]);

  // Calculate totals whenever items, taxRate, or discount changes
  useEffect(() => {
    const subTotal = items.reduce((acc, item) => acc + (item.amount || 0), 0);
    const taxAmount = (subTotal * (formData.taxRate || 0)) / 100;
    const totalAmount = subTotal + taxAmount - (formData.discountAmount || 0);

    setTotals({
      subTotal,
      taxAmount,
      totalAmount: Math.max(0, totalAmount),
    });
  }, [items, formData.taxRate, formData.discountAmount]);

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === "description") {
      item.description = value as string;
    } else if (field === "quantity") {
      item.quantity = Number(value);
      item.amount = item.quantity * item.price;
    } else if (field === "price") {
      item.price = Number(value);
      item.amount = item.quantity * item.price;
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, price: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName) {
      toast.error("Client Name is required");
      return;
    }
    
    if (items.some(i => !i.description)) {
      toast.error("All items must have a description");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        items,
        ...totals
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Invoice updated successfully");
        router.push("/admin/invoices");
      } else {
        toast.error(data.message || "Failed to update invoice");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FE5300]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Invoice</h1>
          <p className="text-xs text-slate-500 tracking-widest uppercase mt-1">
            {invoiceData?.data?.invoiceNumber}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Client Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Client Phone</Label>
              <Input
                id="clientPhone"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="clientAddress">Billing Address</Label>
              <Textarea
                id="clientAddress"
                rows={2}
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                placeholder="123 Main St..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Line Items</h2>
            <Button type="button" onClick={addItem} variant="outline" size="sm" className="h-8 border-[#FE5300] text-[#FE5300] hover:bg-[#FE5300] hover:text-white">
              <Plus size={14} className="mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Item description..."
                    value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    required
                  />
                </div>
                <div className="w-24 space-y-1">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    required
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, "price", e.target.value)}
                    required
                  />
                </div>
                <div className="w-32 py-2 text-right font-mono text-sm bg-slate-50 border border-slate-100 rounded-md px-3 h-9 flex items-center justify-end">
                  ₹{item.amount.toLocaleString("en-IN")}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t pt-6">
            <div className="flex flex-col md:flex-row gap-8 justify-between">
              <div className="flex-1 space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountAmount">Discount Amount (₹)</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / Terms</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Thank you for your business..."
                  />
                </div>
              </div>

              <div className="w-full md:w-64 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 h-fit">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-mono">₹{totals.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax ({formData.taxRate}%):</span>
                  <span className="font-mono">₹{totals.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{formData.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center mt-2">
                  <span className="font-bold text-slate-800">Total:</span>
                  <span className="font-bold text-xl font-mono text-[#FE5300]">
                    ₹{totals.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-[#FE5300] hover:bg-[#e04a00] text-white">
            {loading ? "Updating..." : "Update Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
