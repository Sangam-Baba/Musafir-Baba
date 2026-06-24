import { useState } from "react";
import { secureAdminFetch } from "@/lib/secureAdminFetch";
import { toast } from "sonner";
import { ListUserInterface } from "@/app/admin/role/page";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface LeaveConfigModalProps {
  user: ListUserInterface;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeaveConfigModal({ user, onClose, onSuccess }: LeaveConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    attendanceEligible: user.attendanceEligible ?? true,
    totalLeaveBalance: user.totalLeaveBalance ?? 0,
    availableLeaveBalance: user.availableLeaveBalance ?? 0,
    totalShortLeaveBalance: user.totalShortLeaveBalance ?? 0,
    availableShortLeaveBalance: user.availableShortLeaveBalance ?? 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) : value,
    }));
  };

  const handleToggle = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, attendanceEligible: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/${user._id}/leave-balance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        toast.success("Leave balance updated successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || "Failed to update leave balance");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while updating.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-[16px]">Leave Configuration</h3>
            <p className="text-[11px] font-medium text-slate-500">Configure balance for {user.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-[13px] font-bold text-slate-700">Attendance Eligible</p>
              <p className="text-[11px] font-medium text-slate-500">If disabled, check-ins are not required.</p>
            </div>
            <Switch
              checked={formData.attendanceEligible}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-[#FE5300]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-slate-600">Total Leaves</label>
              <input
                type="number"
                name="totalLeaveBalance"
                value={formData.totalLeaveBalance}
                onChange={handleChange}
                step="0.5"
                min="0"
                className="w-full p-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#FE5300] transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-slate-600">Available Leaves</label>
              <input
                type="number"
                name="availableLeaveBalance"
                value={formData.availableLeaveBalance}
                onChange={handleChange}
                step="0.5"
                min="0"
                className="w-full p-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#FE5300] transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-slate-600">Total Short Leaves</label>
              <input
                type="number"
                name="totalShortLeaveBalance"
                value={formData.totalShortLeaveBalance}
                onChange={handleChange}
                step="1"
                min="0"
                className="w-full p-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#FE5300] transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-slate-600">Available Short Leaves</label>
              <input
                type="number"
                name="availableShortLeaveBalance"
                value={formData.availableShortLeaveBalance}
                onChange={handleChange}
                step="1"
                min="0"
                className="w-full p-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#FE5300] transition-colors"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-sm font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-9 bg-[#FE5300] hover:bg-[#e04a00] text-white text-sm font-semibold shadow-sm">
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
