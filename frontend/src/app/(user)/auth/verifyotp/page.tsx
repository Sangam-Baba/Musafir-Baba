"use client"

import { useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

async function verifyOtp(values: { email: string; otp: string }) {
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

export default function VerifyOtpPage({
  searchParams,
}: {
  searchParams: { email?: string; otp?: string }
}) {
  const router = useRouter()
  const email = searchParams.email ?? ""
  const otp = searchParams.otp ?? ""

  const mutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: () => {
      toast.success("OTP verified successfully")
      setTimeout(() => router.push("/auth/login"), 3000)
    },
    onError: (error) => {
      toast.error(error.message)
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
        {mutation.isPending && <p className="text-center text-gray-500">Please wait...</p>}
        {mutation.isError && (
          <p className="text-center text-red-500">{(mutation.error as Error).message}</p>
        )}
        {mutation.isSuccess && (
          <p className="text-center text-green-500">OTP verified successfully</p>
        )}
      </div>
    </div>
  )
}
