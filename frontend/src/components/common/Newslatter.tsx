"use client";

import { toast } from "sonner";
import { useState } from "react";
import { IndianRupee, ArrowLeftRight } from "lucide-react";
import { FaCcVisa, FaCcMastercard } from "react-icons/fa";

// Visa/Mastercard have real brand glyphs in react-icons. RuPay and UPI don't
// exist as icons in any icon set installed here, so they get the closest
// honest stand-in instead of an invented logo: a rupee mark for RuPay
// (India's domestic card network) and a transfer-arrows glyph for UPI
// (its own mark is literally two arrows).
const PAYMENT_METHODS = [
  { name: "Visa", icon: FaCcVisa, color: "#1A1F71" },
  { name: "Mastercard", icon: FaCcMastercard, color: "#EB001B" },
  { name: "RuPay", icon: IndianRupee, color: "#097939" },
  { name: "UPI", icon: ArrowLeftRight, color: "#6739B7" },
];

const createNewsletter = async (email: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Failed to create newsletter");

  return res.json();
};

function Newslatter() {
  const [email, setEmail] = useState("");

  const handleSubmit = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    try {
      await createNewsletter(email);
      toast.success("Newsletter created successfully!");
      setEmail("");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="hidden md:block">
        <p className="text-lg font-bold">Newsletter</p>
        <p className="w-[30%] h-0.5 bg-[#FE5300]"></p>
      </div>
      <p className="text-sm text-gray-600">
        Subscribe for travel updates and exclusive offers.
      </p>

      <div className="flex flex-col gap-2 mt-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#FE5300] transition-colors"
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-[#FE5300] hover:bg-[#e04800] text-white text-sm font-semibold py-2 rounded-md transition-colors"
        >
          Subscribe
        </button>
      </div>

      {/* Payment methods accepted — icon-only badges, each in its own brand
          color, sitting on the footer's white background. */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className="w-full text-[11px] text-gray-400">We Accept</span>
        {PAYMENT_METHODS.map(({ name, icon: Icon, color }) => (
          <span
            key={name}
            title={name}
            aria-label={name}
            className="flex items-center justify-center border border-gray-200 w-9 h-8 rounded-md"
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </span>
        ))}
      </div>
    </div>
  );
}

export default Newslatter;
