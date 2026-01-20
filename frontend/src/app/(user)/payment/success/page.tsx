import { Check, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function FailurePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Payment SuccessFull
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          Thank you for your payment. You can track your order in your account.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/user"
            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-white font-medium hover:bg-green-700 transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
