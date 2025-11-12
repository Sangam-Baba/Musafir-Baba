import React, { useState } from "react";
import ManualGroupBookings from "@/components/admin/ManualGroupBookings";
import ManualCustomizedBookings from "@/components/admin/ManualCustomizedBooking";
import { Input } from "../ui/input";
function ManualBooking({ onClose }: { onClose: () => void }) {
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl shadow-2xl  max-h-[90vh]  overflow-y-auto p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold mb-4">Manual Bookings</h1>
        <div className="flex gap-4">
          <label className="text-lg font-semibold">Group</label>
          <Input
            type="radio"
            checked={isGroupModalOpen}
            onChange={() => setIsGroupModalOpen(!isGroupModalOpen)}
            className="bg-[#FE5300] text-white px-4 py-2 rounded-md"
          />
          <label className="text-lg font-semibold">Customized</label>
          <Input
            type="radio"
            checked={!isGroupModalOpen}
            onChange={() => setIsGroupModalOpen(!isGroupModalOpen)}
            className="bg-[#FE5300] text-white px-4 py-2 rounded-md"
          />
        </div>
      </div>
      <div className="mt-4 w-3xl">
        {isGroupModalOpen && <ManualGroupBookings onClose={onClose} />}
        {!isGroupModalOpen && <ManualCustomizedBookings onClose={onClose} />}
      </div>
    </div>
  );
}

export default ManualBooking;
