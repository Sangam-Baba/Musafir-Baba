"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner";
import { useEffect } from "react"

async function verifyOtp(values:{ email: string; otp: string }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/verifyOtp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || "OTP verification failed")
  }

  return res.json()
}

export default function VerifyOtpPage() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get("email") || "" // ✅ prefills email
  const otp = params.get("otp") || ""


  const mutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: () => {
      toast.success("OTP verified successfully");
      setTimeout(()=>{router.push("/auth/login")}, 3000); // redirect after success
    },
    onError: (error) => {
        toast.error(error.message);
    },
  })

    useEffect(() => {
    if (email && otp) {
      mutation.mutate({ email, otp })
    }
  }, [email, otp])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-xl bg-white p-8 shadow-md">
        <h1 className="text-xl font-bold text-center">Verifying your email...</h1>
        {mutation.isPending && (
          <p className="text-center text-gray-500">Please wait...</p>
        )}
        {mutation.isError && (
          <p className="text-center text-red-500">
             {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="text-center text-green-500">
             OTP verified successfully
          </p>
        )}
      </div>
    </div>
  )
}