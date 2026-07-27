"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PartnerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Register, Step 2: OTP
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (res.ok || data.success) {
        setMessage("OTP sent securely to your email. Please check your inbox.");
        setStep(2); // Automatically switch to OTP Verification Interface
      } else {
        setMessage(data.message || "Failed to register. Please try again.");
      }
    } catch (error) {
      setMessage("An error occurred during registration. Check server connection.");
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      
      if (res.ok || data.success) {
        setMessage("✅ Email verified successfully! Redirecting...");
        // Redirect to login page after successful verification
        setTimeout(() => {
          router.push("/partner/login"); 
        }, 2000);
      } else {
        setMessage(data.message || "Invalid or expired OTP.");
      }
    } catch (error) {
      setMessage("An error occurred during verification.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50">
      {/* Premium Full-width Header Section */}
      <div className="w-full bg-gradient-to-r from-[#e84118] via-[#FE5300] to-[#f39c12] sticky top-0 z-50 shadow-md">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-3 md:py-2 flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="flex items-center justify-center pr-3 md:pr-5 border-r border-white/20 h-8">
              <img src="/partner/mbconnect.avif" alt="MB Connect Logo" className="h-6 md:h-7 w-auto object-contain drop-shadow-sm brightness-0 invert" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base md:text-xl font-black text-white tracking-tight flex items-center gap-1.5 md:gap-2 leading-none">
                Partner Portal
              </h2>
              <p className="hidden lg:block text-[10px] text-white/90 mt-1 font-medium tracking-wide">Join the fleet and manage your business.</p>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 w-full min-h-[56.25vw] bg-cover bg-top bg-no-repeat flex items-center justify-center lg:justify-start lg:pl-12 xl:pl-24 py-12 px-4 md:px-8"
        style={{ backgroundImage: "url('/partner/bgimage.avif')" }}
      >
        <div className="w-full max-w-[400px] bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl border border-white/20 relative">
        <div className="flex justify-center mb-6">
          <img src="/partner/mbconnect.avif" alt="MB Connect Logo" className="h-12 object-contain" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          {step === 1 ? "Partner Registration" : "Verify Your Email"}
        </h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
        {step === 1 
          ? "Create an account to join the fleet." 
          : `We sent a 6-digit code to ${email}`}
      </p>

      {step === 1 ? (
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FE5300] focus:border-[#FE5300] outline-none"
              placeholder="partner@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FE5300] focus:border-[#FE5300] outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#FE5300] hover:bg-[#e04800] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            Send OTP Verification
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-3 text-center tracking-[0.5em] text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FE5300] focus:border-[#FE5300] outline-none"
              placeholder="123456"
              maxLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#FE5300] hover:bg-[#e04800] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            Verify & Complete Registration
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-gray-500 hover:text-[#FE5300] mt-2 transition-colors"
          >
            Wrong email address? Go back
          </button>
        </form>
      )}

      {message && (
        <div className={`mt-4 p-3 text-sm rounded-lg border ${
          message.includes("✅") ? "bg-green-50 text-green-800 border-green-200" : "bg-blue-50 text-blue-800 border-blue-200"
        }`}>
          {message}
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/partner/login" className="text-[#FE5300] hover:underline font-semibold">
          Login here
        </Link>
      </div>
        </div>
      </div>
    </div>
  );
}
