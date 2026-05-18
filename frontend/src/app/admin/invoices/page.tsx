"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search, Download, Trash2, Edit, Eye, X, Mail, Check, Info } from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import Pagination from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateInvoicePDF } from "@/lib/generateInvoicePdf";

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType?: "Package" | "Rental";
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  invoiceDate: string;
  dueDate: string;
  customerId?: string;
  paymentMode?: string;
  remarks?: string;
  billingFrom?: {
    gstnNo: string;
    address: string;
    contactNo: string;
    emailId: string;
    website: string;
  };
  billingTo?: {
    bedSharing: string;
    emergencyContact: string;
  };
  packageSummary?: {
    particulars: string;
    duration: string;
    startDate: string;
    endDate: string;
    packagePrice: number;
  };
  rentalSummary?: {
    vehicleName: string;
    checkIn: string;
    checkOut: string;
    numberOfVehicles: number;
  };
  passengerDetails?: Array<{
    sNo: number;
    name: string;
    aadharNo: string;
    age: string;
    address: string;
    medical: string;
  }>;
  paymentSummary?: {
    paymentId: string;
    advanceReceived: number;
    cgst: number;
    sgst: number;
    balanceAmount: number;
  };
  items: InvoiceItem[];
  subTotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  notes: string;
  isApproved?: boolean;
  salesPerson?: any;
  downloadLogs?: Array<{
    user: {
      name: string;
      designation?: string;
    };
    timestamp: string;
  }>;
  emailLogs?: Array<{
    user: {
      name: string;
      designation?: string;
    };
    timestamp: string;
  }>;
}

const getInvoices = async (page: number, search: string, token: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/invoice?page=${page}&search=${search}&limit=10`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!res.ok) throw new Error("Failed to fetch invoices");
  const data = await res.json();
  return data;
};

export default function InvoicesPage() {
  const token = useAdminAuthStore((state) => state.accessToken) as string;
  const role = useAdminAuthStore((state) => state.role);
  const [filter, setFilter] = useState({ search: "" });
  const [page, setPage] = useState(1);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>("");
  const [sendingMailId, setSendingMailId] = useState<string | null>(null);
  const router = useRouter();

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${id}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Invoice approved successfully!");
        refetch();
      } else {
        toast.error(data.message || "Failed to approve invoice");
      }
    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Something went wrong while approving invoice");
    }
  };

  const {
    data: invoicesData,
    refetch,
    isLoading,
    isError,
    error,
  } = useQuery<any>({
    queryKey: ["invoices", page, filter.search],
    queryFn: () => getInvoices(page, filter.search, token),
    enabled: !!token,
    retry: 2,
  });

  const invoices = invoicesData?.data ?? [];
  const meta = {
    total: invoicesData?.total ?? 0,
    totalPages: invoicesData?.pages ?? 1,
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/invoices/edit/${id}`);
  };

  const logDownload = async (invoiceId: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoiceId}/log-download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      refetch();
    } catch (err) {
      console.error("Failed to log download:", err);
    }
  };

  const handleDelete = async (id: string) => {
    const invoice = invoices.find((inv: Invoice) => inv._id === id);
    if (invoice?.isApproved) {
      toast.error("Approved invoices cannot be deleted.");
      return;
    }

    if (!confirm("Are you sure you want to delete this invoice?")) return null;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Invoice deleted successfully");
        refetch();
      } else {
        toast.error(data.message || "Failed to delete invoice");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while deleting invoice");
    }
  };

  const handleAction = async (invoice: Invoice, action: "view" | "download" | "mail") => {
    if (action === "view") {
      const dataUrl = generateInvoicePDF(invoice, "dataurl");
      if (dataUrl) {
        setPdfDataUrl(dataUrl);
        setPreviewInvoice(invoice);
      }
    } else if (action === "download") {
      if (!invoice.isApproved) {
        toast.error("Invoice must be approved before download!");
        return;
      }
      generateInvoicePDF(invoice, "download");
      toast.success("Invoice downloaded!");
      logDownload(invoice._id);
    } else if (action === "mail") {
      if (!invoice.isApproved) {
        toast.error("Invoice must be approved before sending via email!");
        return;
      }
      if (!invoice.clientEmail) {
        return toast.error("Client email is missing for this invoice!");
      }

      setSendingMailId(invoice._id);
      try {
        const base64Pdf = generateInvoicePDF(invoice, "base64");
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoice._id}/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            base64Pdf,
            fileName: `${invoice.invoiceNumber}.pdf`
          })
        });

        const data = await res.json();
        if (data.success) {
          toast.success(`Invoice sent to ${invoice.clientEmail} successfully!`);
          refetch();
        } else {
          toast.error(data.message || "Failed to send email");
        }
      } catch (error) {
        console.error("Email error:", error);
        toast.error("Something went wrong while sending email");
      } finally {
        setSendingMailId(null);
      }
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Bills & Invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              className="pl-8 border border-gray-300 rounded-md px-2 py-1 h-9"
              value={filter.search}
              onChange={(e) => {
                setFilter({ search: e.target.value });
                setPage(1);
              }}
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={14} />
            </div>
          </div>
          <button
            onClick={() => router.push("/admin/invoices/new")}
            className="bg-[#FE5300] text-white px-4 py-2 rounded-lg shadow hover:bg-[#FE5300]/90 transition font-medium text-sm"
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#FE5300]" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Invoice No.</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Client</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Total</TableHead>
                  {(role === "admin" || role === "superadmin") && (
                    <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Created By</TableHead>
                  )}
                  <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
               <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={role === "admin" || role === "superadmin" ? 7 : 6} className="text-center py-10 text-slate-500">
                      No invoices found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice: Invoice) => (
                    <TableRow key={invoice._id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="py-3 px-4 font-mono text-sm font-semibold text-slate-700">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm font-medium text-slate-800">
                        {invoice.clientName}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-slate-500">
                        {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                           day: "numeric", month: "short", year: "numeric"
                        })}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {invoice.isApproved ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                            Pending Approval
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 font-mono font-medium text-slate-700">
                        ₹{invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      {(role === "admin" || role === "superadmin") && (
                        <TableCell className="py-3 px-4 text-sm text-slate-500">
                          {invoice.salesPerson ? (
                            <div>
                              <div className="font-semibold text-slate-700">{invoice.salesPerson.name}</div>
                              {invoice.salesPerson.designation && (
                                <div className="text-[11px] text-slate-400 font-medium">{invoice.salesPerson.designation}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">System / Legacy</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="py-3 px-4 text-right space-x-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            >
                              <Info size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="bg-white border border-slate-200 p-3 shadow-md rounded-xl max-w-xs z-50">
                            <div className="space-y-3 p-1 max-w-[220px] text-xs text-left">
                              {/* Downloads Section */}
                              <div>
                                <div className="font-semibold text-slate-700 flex items-center justify-between border-b border-slate-100 pb-1 mb-1">
                                  <span>Downloads</span>
                                  <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {invoice.downloadLogs?.length || 0}
                                  </span>
                                </div>
                                {invoice.downloadLogs && invoice.downloadLogs.length > 0 ? (
                                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                                    {invoice.downloadLogs.map((log: any, idx: number) => (
                                      <div key={idx} className="flex flex-col text-slate-500 text-[10px] border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                                        <span className="font-medium text-slate-700 truncate">
                                          {log.user?.name || "Staff"}
                                        </span>
                                        <span className="text-slate-400 text-[9px]">
                                          {log.user?.designation || "Executive"}
                                        </span>
                                        <span className="text-slate-400 text-[9px] mt-0.5">
                                          {new Date(log.timestamp).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-slate-400 italic text-[10px] py-0.5">No downloads yet</div>
                                )}
                              </div>

                              {/* Emails Section */}
                              <div>
                                <div className="font-semibold text-slate-700 flex items-center justify-between border-b border-slate-100 pb-1 mb-1 mt-1">
                                  <span>Emails Sent</span>
                                  <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {invoice.emailLogs?.length || 0}
                                  </span>
                                </div>
                                {invoice.emailLogs && invoice.emailLogs.length > 0 ? (
                                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                                    {invoice.emailLogs.map((log: any, idx: number) => (
                                      <div key={idx} className="flex flex-col text-slate-500 text-[10px] border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                                        <span className="font-medium text-slate-700 truncate">
                                          {log.user?.name || "Staff"}
                                        </span>
                                        <span className="text-slate-400 text-[9px]">
                                          {log.user?.designation || "Executive"}
                                        </span>
                                        <span className="text-slate-400 text-[9px] mt-0.5">
                                          {new Date(log.timestamp).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-slate-400 italic text-[10px] py-0.5">No emails sent yet</div>
                                )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Invoice"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleAction(invoice, "view")}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!invoice.isApproved}
                          title="Download PDF"
                          className={`h-8 w-8 p-0 ${invoice.isApproved ? "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" : "text-slate-300 hover:text-slate-300 hover:bg-transparent cursor-not-allowed"}`}
                          onClick={() => handleAction(invoice, "download")}
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!invoice.isApproved || sendingMailId === invoice._id}
                          title="Send Email"
                          className={`h-8 w-8 p-0 ${invoice.isApproved ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-slate-300 hover:text-slate-300 hover:bg-transparent cursor-not-allowed"}`}
                          onClick={() => handleAction(invoice, "mail")}
                        >
                          {sendingMailId === invoice._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Mail size={14} />
                          )}
                        </Button>
                        {!invoice.isApproved && (role === "admin" || role === "superadmin") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Approve Invoice"
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => handleApprove(invoice._id)}
                          >
                            <Check size={14} />
                          </Button>
                        )}
                        {!invoice.isApproved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Invoice"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                            onClick={() => handleEdit(invoice._id)}
                          >
                            <Edit size={14} />
                          </Button>
                        )}
                        {!invoice.isApproved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete Invoice"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(invoice._id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-2 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Showing {((page - 1) * 10) + (invoices.length > 0 ? 1 : 0)} - {Math.min(page * 10, meta.total)} of {meta.total}
            </p>
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}
      {isError && toast.error(error.message)}

      {/* PDF Preview Drawer */}
      {previewInvoice && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => {
              URL.revokeObjectURL(pdfDataUrl);
              setPreviewInvoice(null);
            }}
          />
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-[55vw] max-w-4xl bg-white shadow-2xl z-50 flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Invoice Preview</p>
                <h2 className="font-bold text-slate-800 text-lg mt-0.5">{previewInvoice.invoiceNumber}</h2>
              </div>
              <div className="flex items-center gap-2">
                {previewInvoice.isApproved && (
                  <button
                    onClick={() => {
                      generateInvoicePDF(previewInvoice, "download");
                      toast.success("Invoice downloaded!");
                      logDownload(previewInvoice._id);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#FE5300] text-white px-4 py-2 rounded-lg hover:bg-[#FE5300]/90 transition"
                  >
                    <Download size={13} /> Download PDF
                  </button>
                )}
                <button
                  onClick={() => {
                    URL.revokeObjectURL(pdfDataUrl);
                    setPreviewInvoice(null);
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {/* PDF iframe */}
            <iframe
              src={`${pdfDataUrl}#toolbar=0`}
              className="flex-1 w-full border-0"
              title="Invoice PDF Preview"
            />
          </div>
        </>
      )}
    </div>
  </TooltipProvider>
  );
}
