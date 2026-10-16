import { XCircle } from "lucide-react";
import Link from "next/link";

export default async function FailurePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const isFromMbgo = from === "mbgo";

  // MBConnect driver wallet recharge (opened from the app in the phone browser).
  if (from === "mbconnect-recharge") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Recharge failed</h1>
          <p className="text-gray-600">Your payment didn’t go through and no money was added to your wallet. If money was deducted, contact MBConnect support from the Help Center. You can try again from the Partner Wallet screen.</p>
          <p className="mt-4 text-sm text-gray-500">You can close this page and go back to the MBConnect app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Payment Failed
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          Unfortunately, we couldn’t process your payment. This may be due to
          insufficient funds, network issues, or an invalid payment method.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href={isFromMbgo ? "/mbgo" : "/"}
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-white font-medium hover:bg-red-700 transition"
          >
            {isFromMbgo ? "Back to MBGo" : "Go Back Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
