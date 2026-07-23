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
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-100 mt-10 mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        {step === 1 ? "Partner Registration" : "Verify Your Email"}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
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
  );
}
