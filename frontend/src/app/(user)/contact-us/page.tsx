import Hero from "@/components/custom/Hero";
import React from "react";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import Breadcrumb from "@/components/common/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import { getWebPageBySlug } from "@/app/(user)/[...slug]/page";

export async function generateMetadata() {
  const data = await getWebPageBySlug("contact-us");
  return {
    title: data?.metaTitle,
    description: data?.metaDescription,
    keywords: data?.keywords,
    alternates: {
      canonical: data?.canonicalUrl
        ? `https://musafirbaba.com${data.canonicalUrl}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/contact-us`,
    },
    openGraph: {
      title: data?.title,
      description: data?.description,
      url: data?.canonicalUrl
        ? `https://musafirbaba.com${data.canonicalUrl}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/contact-us`,
      type: "website",
      images:
        data?.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
    },
  };
}
async function VisaWebPage() {
  const visa = await getWebPageBySlug("contact-us");

  return (
    <section className="">
      <Hero
        image={visa?.coverImage?.url || "/Hero2.jpg"}
        title={visa.title}
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <article className="w-full  flex flex-col items-center">
          {/* <header className="mt-6 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">{visa.title}</h1>
          </header> */}
          <div className="flex ietms-center">
            <section className="prose prose-lg max-w-none mt-6 text-center">
              <BlogContent html={visa.content} />
            </section>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ">
            <Card className="mt-8 bg-[#CDFFC9] shadow hover:shadow-lg transition duration-500 ">
              <CardContent className="flex  flex-col items-center gap-4">
                <MapPin className=" h-10 w-10" color="#FF5733" />
                <p className="font-bold text-2xl text-center">Our Location</p>
                <p className="text-center">
                  1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near
                  Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi,
                  Delhi, 110043
                </p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#FE5000] shadow hover:shadow-lg transition duration-500 ">
              <CardContent className="flex  flex-col items-center gap-4">
                <Phone className=" h-10 w-10" color="#CDFFC9" />
                <p className="font-bold text-2xl text-center text-white">
                  Phone
                </p>
                <p className="text-center text-white">Tour: +91 92896 02447 </p>
                <p className="text-center text-white">Visa: +91 93556 63591</p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#CDFFC9] shadow hover:shadow-lg transition duration-500  ">
              <CardContent className="flex  flex-col items-center gap-4">
                <Mail className=" h-10 w-10" color="#FF5733" />
                <p className="font-bold text-2xl text-center">Email</p>
                <p className="text-center">care@musafirbaba.com</p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#FE5000] shadow hover:shadow-lg transition duration-500 ">
              <CardContent className="flex  flex-col items-center gap-4">
                <Clock className=" h-10 w-10" color="#CDFFC9" />
                <p className="font-bold text-2xl text-center text-white">
                  Working Hours
                </p>
                <p className="text-center text-white">
                  Mon-Sat : 9:00 AM to 6:00 PM <br />
                  Sun : Closed
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-20 w-full flex flex-col md:flex-row gap-4">
            <Image
              className="object-cover w-full md:w-1/2 h-full  rounded-xl"
              src="https://cdn.musafirbaba.com/images/5561899_21273_u8g7cq.jpg"
              width={500}
              height={510}
              alt="Musafirbaba Contact Us"
            />
            <div className="w-full md:w-1/2">
              <QueryForm />
            </div>
          </div>
          <div className="w-full border border-gray-200 shadow-lg  rounded-2xl mt-20 h-[400px] overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.624108549693!2d76.97522459999999!3d28.611051399999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d05a3e076b787%3A0xc858632593d54601!2sMusafirBaba%20-%20Best%20Travel%20Agency%20in%20Delhi%20I%20Holidays%20I%20Visa!5e0!3m2!1sen!2sin!4v1760166725887!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: "0" }}
            ></iframe>
          </div>
        </article>
      </div>
    </section>
  );
}

export default VisaWebPage;
