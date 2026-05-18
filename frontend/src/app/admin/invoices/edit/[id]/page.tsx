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
    invoiceType: "Package",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    invoiceDate: "",
    dueDate: "",
    taxRate: 0,
    discountAmount: 0,
    notes: "",
    customerId: "",
    paymentMode: "",
    remarks: "",
    billingTo: {
      bedSharing: "N/A",
      emergencyContact: "",
    },
    packageSummary: {
      particulars: "",
      duration: "",
      startDate: "",
      endDate: "",
      packagePrice: 0,
    },
    rentalSummary: {
      vehicleName: "",
      checkIn: "",
      checkOut: "",
      numberOfVehicles: 1,
    },
    paymentSummary: {
      paymentId: "",
      advanceReceived: 0,
      cgst: 0,
      sgst: 0,
      balanceAmount: 0,
    }
  });

  const [items, setItems] = useState([
    { description: "", quantity: 1, price: 0, amount: 0 }
  ]);

  const [passengerDetails, setPassengerDetails] = useState([
    { sNo: 1, name: "", aadharNo: "N/A", age: "N/A", address: "", medical: "N/A" }
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
      if (inv.isApproved) {
        toast.error("Approved invoices cannot be edited.");
        router.push("/admin/invoices");
        return;
      }
      setFormData({
        invoiceType: inv.invoiceType || "Package",
        clientName: inv.clientName || "",
        clientEmail: inv.clientEmail || "",
        clientPhone: inv.clientPhone || "",
        clientAddress: inv.clientAddress || "",
        invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split("T")[0] : "",
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "",
        taxRate: inv.taxRate || 0,
        discountAmount: inv.discountAmount || 0,
        notes: inv.notes || "",
        customerId: inv.customerId || "",
        paymentMode: inv.paymentMode || "",
        remarks: inv.remarks || "",
        billingTo: {
          bedSharing: inv.billingTo?.bedSharing || "N/A",
          emergencyContact: inv.billingTo?.emergencyContact || "",
        },
        packageSummary: {
          particulars: inv.packageSummary?.particulars || "",
          duration: inv.packageSummary?.duration || "",
          startDate: inv.packageSummary?.startDate ? new Date(inv.packageSummary.startDate).toISOString().split("T")[0] : "",
          endDate: inv.packageSummary?.endDate ? new Date(inv.packageSummary.endDate).toISOString().split("T")[0] : "",
          packagePrice: inv.packageSummary?.packagePrice || 0,
        },
        paymentSummary: {
          paymentId: inv.paymentSummary?.paymentId || "",
          advanceReceived: inv.paymentSummary?.advanceReceived || 0,
          cgst: inv.paymentSummary?.cgst || 0,
          sgst: inv.paymentSummary?.sgst || 0,
          balanceAmount: inv.paymentSummary?.balanceAmount || 0,
        },
        rentalSummary: {
          vehicleName: inv.rentalSummary?.vehicleName || "",
          checkIn: inv.rentalSummary?.checkIn ? new Date(inv.rentalSummary.checkIn).toISOString().split("T")[0] : "",
          checkOut: inv.rentalSummary?.checkOut ? new Date(inv.rentalSummary.checkOut).toISOString().split("T")[0] : "",
          numberOfVehicles: inv.rentalSummary?.numberOfVehicles || 1,
        }
      });
      setItems(inv.items || [{ description: "", quantity: 1, price: 0, amount: 0 }]);
      setPassengerDetails(inv.passengerDetails || [{ sNo: 1, name: "", aadharNo: "N/A", age: "N/A", address: "", medical: "N/A" }]);
    }
  }, [invoiceData]);

  // Sync passenger count with item quantity automatically ONLY for Package
  useEffect(() => {
    if (formData.invoiceType !== "Package") return;
    const paxCount = passengerDetails.length;
    setItems((prevItems) => {
      const needsUpdate = prevItems.some(item => item.quantity !== paxCount);
      if (!needsUpdate) return prevItems;
      return prevItems.map(item => ({
        ...item,
        quantity: paxCount,
        amount: paxCount * item.price
      }));
    });
  }, [passengerDetails.length, formData.invoiceType]);

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

  const handlePassengerChange = (index: number, field: string, value: string | number) => {
    const newPassengers = [...passengerDetails];
    (newPassengers[index] as any)[field] = value;
    setPassengerDetails(newPassengers);
  };

  const addPassenger = () => {
    setPassengerDetails([...passengerDetails, { sNo: passengerDetails.length + 1, name: "", aadharNo: "N/A", age: "N/A", address: "", medical: "N/A" }]);
  };

  const removePassenger = (index: number) => {
    if (passengerDetails.length > 1) {
      const newPassengers = passengerDetails.filter((_, i) => i !== index).map((p, i) => ({ ...p, sNo: i + 1 }));
      setPassengerDetails(newPassengers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName) {
      toast.error("Client Name is required");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        items,
        passengerDetails,
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
        {/* INVOICE TYPE SELECTOR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Invoice Type</h2>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Button
              type="button"
              variant="ghost"
              className={`px-6 h-8 text-sm ${formData.invoiceType === "Package" ? "bg-white shadow-sm font-medium text-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}
              onClick={() => setFormData({ ...formData, invoiceType: "Package" })}
            >
              Package
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`px-6 h-8 text-sm ${formData.invoiceType === "Rental" ? "bg-white shadow-sm font-medium text-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}
              onClick={() => setFormData({ ...formData, invoiceType: "Rental" })}
            >
              Rental
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer ID</Label>
              <Input
                id="customerId"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="5313"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <select
                id="paymentMode"
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select Payment Mode</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="A/C TRANSFER">A/C TRANSFER</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Booking amount received"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Billing Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700">Billing From (Fixed)</h3>
              <div className="text-sm text-slate-500 space-y-1">
                <p><strong>Musafirbaba Travels Pvt Ltd</strong></p>
                <p>GSTN: 07AAQCM4510N1Z2</p>
                <p>Najafgarh, ND - 110043</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700">Billing To</h3>
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Client Phone</Label>
                  <Input
                    id="clientPhone"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="bedSharing">Bed Sharing</Label>
                  <Input
                    id="bedSharing"
                    value={formData.billingTo.bedSharing}
                    onChange={(e) => setFormData({ ...formData, billingTo: { ...formData.billingTo, bedSharing: e.target.value } })}
                    placeholder="N/A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.billingTo.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, billingTo: { ...formData.billingTo, emergencyContact: e.target.value } })}
                    placeholder="9289602447"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Client Address</Label>
                <Textarea
                  id="clientAddress"
                  rows={2}
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                  placeholder="Billing address..."
                />
              </div>
            </div>
          </div>
        </div>

        {formData.invoiceType === "Package" && (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-4 text-slate-800">Package Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="particulars">Particulars</Label>
              <Input
                id="particulars"
                value={formData.packageSummary.particulars}
                onChange={(e) => setFormData({ ...formData, packageSummary: { ...formData.packageSummary, particulars: e.target.value } })}
                placeholder="Helicopter Booking (Sersi to Sersi)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.packageSummary.duration}
                onChange={(e) => setFormData({ ...formData, packageSummary: { ...formData.packageSummary, duration: e.target.value } })}
                placeholder="24 hours"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.packageSummary.startDate}
                onChange={(e) => setFormData({ ...formData, packageSummary: { ...formData.packageSummary, startDate: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.packageSummary.endDate}
                onChange={(e) => setFormData({ ...formData, packageSummary: { ...formData.packageSummary, endDate: e.target.value } })}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Passenger Details</h2>
            <Button type="button" onClick={addPassenger} variant="outline" size="sm" className="h-8 border-[#FE5300] text-[#FE5300] hover:bg-[#FE5300] hover:text-white">
              <Plus size={14} className="mr-1" /> Add Passenger
            </Button>
          </div>
          <div className="space-y-4">
            {passengerDetails.map((p, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100 relative group">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">S.No</Label>
                  <Input value={p.sNo} disabled className="h-8" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Name / Pax</Label>
                  <Input value={p.name} onChange={(e) => handlePassengerChange(index, "name", e.target.value)} placeholder="Name" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Aadhar No</Label>
                  <Input value={p.aadharNo} onChange={(e) => handlePassengerChange(index, "aadharNo", e.target.value)} placeholder="N/A" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Age</Label>
                  <Input value={p.age} onChange={(e) => handlePassengerChange(index, "age", e.target.value)} placeholder="N/A" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Medical</Label>
                  <Input value={p.medical} onChange={(e) => handlePassengerChange(index, "medical", e.target.value)} placeholder="N/A" className="h-8" />
                </div>
                <div className="md:col-span-6 space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Address</Label>
                  <Input value={p.address} onChange={(e) => handlePassengerChange(index, "address", e.target.value)} placeholder="Passenger Address" className="h-8" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border shadow-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePassenger(index)}
                  disabled={passengerDetails.length === 1}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            ))}
          </div>
        </div>
          </>
        )}

        {formData.invoiceType === "Rental" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Rental Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="vehicleName">Vehicle Name</Label>
                <Input
                  id="vehicleName"
                  value={formData.rentalSummary.vehicleName}
                  onChange={(e) => setFormData({ ...formData, rentalSummary: { ...formData.rentalSummary, vehicleName: e.target.value } })}
                  placeholder="Toyota Innova Crysta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check In</Label>
                <Input
                  id="checkIn"
                  type="date"
                  value={formData.rentalSummary.checkIn}
                  onChange={(e) => setFormData({ ...formData, rentalSummary: { ...formData.rentalSummary, checkIn: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check Out</Label>
                <Input
                  id="checkOut"
                  type="date"
                  value={formData.rentalSummary.checkOut}
                  onChange={(e) => setFormData({ ...formData, rentalSummary: { ...formData.rentalSummary, checkOut: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfVehicles">Number of Vehicles</Label>
                <Input
                  id="numberOfVehicles"
                  type="number"
                  min="1"
                  value={formData.rentalSummary.numberOfVehicles}
                  onChange={(e) => setFormData({ ...formData, rentalSummary: { ...formData.rentalSummary, numberOfVehicles: parseInt(e.target.value) || 1 } })}
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Payment Items (Summary)</h2>
            <Button type="button" onClick={addItem} variant="outline" size="sm" className="h-8 border-[#FE5300] text-[#FE5300] hover:bg-[#FE5300] hover:text-white">
              <Plus size={14} className="mr-1" /> Add Row
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cgst">CGST (₹)</Label>
                    <Input
                      id="cgst"
                      type="number"
                      min="0"
                      value={formData.paymentSummary.cgst}
                      onChange={(e) => setFormData({ ...formData, paymentSummary: { ...formData.paymentSummary, cgst: Number(e.target.value) } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sgst">SGST (₹)</Label>
                    <Input
                      id="sgst"
                      type="number"
                      min="0"
                      value={formData.paymentSummary.sgst}
                      onChange={(e) => setFormData({ ...formData, paymentSummary: { ...formData.paymentSummary, sgst: Number(e.target.value) } })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="advanceReceived">Advance Received (₹)</Label>
                  <Input
                    id="advanceReceived"
                    type="number"
                    min="0"
                    value={formData.paymentSummary.advanceReceived}
                    onChange={(e) => setFormData({ ...formData, paymentSummary: { ...formData.paymentSummary, advanceReceived: Number(e.target.value) } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentId">Payment ID</Label>
                  <Input
                    id="paymentId"
                    value={formData.paymentSummary.paymentId}
                    onChange={(e) => setFormData({ ...formData, paymentSummary: { ...formData.paymentSummary, paymentId: e.target.value } })}
                    placeholder="e.g. UPI/515850948410"
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
              </div>

              <div className="w-full md:w-80 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 h-fit">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-mono">₹{totals.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">CGST + SGST:</span>
                  <span className="font-mono">₹{(formData.paymentSummary.cgst + formData.paymentSummary.sgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{formData.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center mt-2">
                  <span className="font-bold text-slate-800">Total Amount:</span>
                  <span className="font-bold text-lg font-mono text-slate-900">
                    ₹{(totals.subTotal + formData.paymentSummary.cgst + formData.paymentSummary.sgst - formData.discountAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Advance Received:</span>
                  <span className="font-mono">₹{formData.paymentSummary.advanceReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center mt-2">
                  <span className="font-bold text-slate-800 uppercase text-xs tracking-wider">Balance Due:</span>
                  <span className="font-bold text-xl font-mono text-[#FE5300]">
                    ₹{Math.max(0, (totals.subTotal + formData.paymentSummary.cgst + formData.paymentSummary.sgst - formData.discountAmount) - formData.paymentSummary.advanceReceived).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
