"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

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
        
        // Save the token if returned in body (fallback if not using strict httpOnly cookies on frontend)
        if (data.token) {
          localStorage.setItem("partner_token", data.token);
        }

        setTimeout(() => {
          router.push("/partner-dashboard"); 
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
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Partner Login</h2>
      <p className="text-sm text-gray-500 mb-6">Welcome back! Sign in to manage your fleet.</p>

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
          Login to Dashboard
        </button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-sm text-gray-500">Don't have an account? </span>
        <Link href="/partner-register" className="text-sm text-[#FE5300] hover:underline font-medium">
          Register here
        </Link>
      </div>

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
