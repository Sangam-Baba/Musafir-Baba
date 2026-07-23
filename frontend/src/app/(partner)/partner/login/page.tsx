"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"login" | "forgot-password" | "reset-password">("login");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setMessage("✅ OTP sent to your email.");
        setView("reset-password");
      } else {
        setMessage(data.message || "Failed to send reset OTP.");
      }
    } catch (error) {
      setMessage("An error occurred. Check server connection.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setMessage("✅ Password reset successfully! You can now login.");
        setView("login");
        setOtp("");
        setNewPassword("");
        setPassword("");
      } else {
        setMessage(data.message || "Failed to reset password.");
      }
    } catch (error) {
      setMessage("An error occurred. Check server connection.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (res.ok || data.success) {
        setMessage("✅ Login successful! Redirecting to dashboard...");
        
        // Save the access token
        if (data.accessToken) {
          localStorage.setItem("partner_token", data.accessToken);
        }

        setTimeout(() => {
          router.push("/partner/dashboard"); 
        }, 1000);
      } else {
        setMessage(data.message || "Failed to login. Please try again.");
      }
    } catch (error) {
      setMessage("An error occurred during login. Check server connection.");
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-100 mt-10 mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        {view === "login" ? "Partner Login" : view === "forgot-password" ? "Forgot Password" : "Reset Password"}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {view === "login" 
          ? "Welcome back! Sign in to manage your fleet." 
          : view === "forgot-password" 
          ? "Enter your email to receive a password reset OTP." 
          : `Enter the OTP sent to ${email} and your new password.`}
      </p>

      
      {view === "login" && (
        <>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button 
                  type="button" 
                  onClick={() => { setView("forgot-password"); setMessage(""); }} 
                  className="text-xs text-[#FE5300] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
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
              Login to Dashboard
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-sm text-gray-500">Don't have an account? </span>
            <Link href="/partner/register" className="text-sm text-[#FE5300] hover:underline font-medium">
              Register here
            </Link>
          </div>
        </>
      )}

      {view === "forgot-password" && (
        <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
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
          <button
            type="submit"
            className="w-full bg-[#FE5300] hover:bg-[#e04800] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            Send Reset OTP
          </button>
          <button
            type="button"
            onClick={() => { setView("login"); setMessage(""); }}
            className="text-sm text-gray-500 hover:text-[#FE5300] mt-2 transition-colors"
          >
            Back to Login
          </button>
        </form>
      )}

      {view === "reset-password" && (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Reset OTP</label>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FE5300] focus:border-[#FE5300] outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#FE5300] hover:bg-[#e04800] text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            Reset Password
          </button>
          <button
            type="button"
            onClick={() => { setView("login"); setMessage(""); }}
            className="text-sm text-gray-500 hover:text-[#FE5300] mt-2 transition-colors"
          >
            Back to Login
          </button>
        </form>
      )}


      {message && (
        <div className={`mt-4 p-3 text-sm rounded-lg border ${
          message.includes("✅") ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
