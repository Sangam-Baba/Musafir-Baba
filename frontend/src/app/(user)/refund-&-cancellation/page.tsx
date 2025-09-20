import Hero from "@/components/custom/Hero"

import { Metadata } from "next"
export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Travel Booking Terms",
  description:
    "Our refund and cancellation policy explained simply. Clear terms for travel booking changes and refunds.",
  alternates: {
    canonical: "https://www.musafirbaba.com/refund-&-cancellation",
  },
}

function RefundPage() {
  return (
    <section>
        <Hero image="/Heroimg.jpg" title="Refund & Cancellation" />
        <div className="container lg:max-w-7xl mx-auto py-10 px-8">
            <div>
             <h1 className="text-3xl font-bold mb-4">
                Refund & Cancellation
             </h1>
             <div className="w-20 h-1 bg-[#FE5300]"></div>
            </div>
            <div className="mt-8">
                <p className="font-bold mt-4 mb-4">Cancellation Policy</p>
                <p>{`Musafirbaba believes in assisting its clients to the greatest extent feasible and has a flexible cancellation policy as a result.

Cancellations will be accepted only if made within 12 hours after making an order, according to this policy. However, if the purchases have been completed or if we have begun the request or process of membership or shipment either ourselves or through the vendors/merchants/representatives whom we may designate from time to time, the cancellation request will not be considered.

However, there are no cancellation rules in effect for membership services. Our subscription cannot be cancelled after it has been purchased. You can, however, request that your account be deleted at any time.

No cancellations are accepted for items on which the Musafirbaba marketing team has provided exceptional discounts for a variety of reasons, including but not limited to special events such as Holi, Diwali, Valentine's Day, certain examinations, and so on. Since these are limited-time deals, cancellations are not permitted.

Please notify our Customer Service staff, if you get damaged study materials or non-durable products such as CDs and DVDs. The request, however, will be considered if the merchant has checked and determined the same at his end. This should be notified within a week of the items being delivered to your location.

If you believe that the goods you got are not as described on the website or meet your expectations, you must notify our customer service within 24 hours of receiving the product. After reviewing your complaint, the Customer Service Team will make an appropriate conclusion.`}</p>

<p className="font-bold mt-4 mb-4">Refund Policy</p>

<p>{`There is no return policy in place (refund would proceed only in case if you have made a payment more than once for the same item).

It is recommended that you review the website's demo videos and terms and conditions before purchasing any course or content or joining our membership. We are not responsible if you do not enjoy the course after purchasing it or if you are dissatisfied with the services provided.
`}</p>
            </div> 
        </div>
    </section>
  )
}

export default RefundPage