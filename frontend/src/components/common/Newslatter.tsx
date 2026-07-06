"use client";

import { toast } from "sonner";
import { useState } from "react";

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
    <section className="w-full bg-[#FE5300] py-12 md:py-16 relative overflow-hidden">
      {/* Background Decorative Effects */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Left Organic Wave */}
        <svg 
          className="absolute top-0 left-0 h-full w-[250px] md:w-[350px] text-white opacity-10" 
          preserveAspectRatio="none" 
          viewBox="0 0 200 200"
        >
          <path fill="currentColor" d="M0,0 L150,0 C90,60 190,130 60,200 L0,200 Z" />
        </svg>
        {/* Top-Right Massive Circle */}
        <div className="absolute -top-[150px] -right-[100px] md:-top-[250px] md:-right-[150px] w-[350px] h-[350px] md:w-[600px] md:h-[600px] rounded-full bg-white opacity-10 blur-[1px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 w-full relative z-10">
        <div className="w-full md:w-1/2 flex flex-col gap-2">
          <h4 className="text-xl md:text-[22px] font-medium text-white tracking-tight leading-snug">
            Get exclusive deals and visa updates in your inbox
          </h4>
          <p className="text-[14px] md:text-[15px] text-orange-100 font-normal">
            Join our travel community — hidden gems, latest deals, and visa news.
          </p>
        </div>
        
        <div className="w-full md:w-1/2 flex justify-start md:justify-end">
          <div className="flex w-full md:max-w-md shadow-sm rounded-md bg-white">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-transparent border-0 rounded-l-md px-4 py-2.5 outline-none text-gray-800 placeholder-gray-400 focus:ring-0 text-[15px]"
            />
            <button
              onClick={handleSubmit}
              className="bg-white border-l border-gray-200 px-6 py-2.5 font-semibold text-[#FE5300] text-[15px] rounded-r-md hover:bg-gray-50 transition-colors shrink-0"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Newslatter;
