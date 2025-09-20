import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";


export default function SuccessPage() {
  return (
    <section className="flex items-center justify-center w-full px-4 md:px-8 lg:px-20 py-16">
      <Card className="w-2xl">
          <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">Payment Status</CardTitle>
        </CardHeader>
       <CardContent>
         <div className="p-6 text-green-600">
          <h1>✅ Payment Successful</h1>
          <p>Thank you for your order!</p>
          <span className="text-sm">Go to <Link href="/">Home</Link></span>
        </div>
       </CardContent>

      </Card>
    </section>


  );
}
