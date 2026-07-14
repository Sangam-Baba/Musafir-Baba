import Hero from "@/components/custom/Hero";
import React from "react";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import Breadcrumb from "@/components/common/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import { getWebPageBySlug } from "@/app/(user)/[...slug]/page";
import { CONTACT_INFO } from "@/config/contact";

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
        <article className="w-full flex flex-col items-center">
          <div className="flex items-center w-full justify-center">
            <section className="prose prose-lg max-w-2xl mt-4 text-center text-gray-600 leading-relaxed">
              <BlogContent html={visa.content} />
            </section>
          </div>

          {/* Contact Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-12">
            {/* Location */}
            <div className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FE5300] transition-all duration-300">
                <MapPin className="w-7 h-7 text-[#FE5300] group-hover:text-white transition-colors duration-300" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-lg font-heading text-gray-900">Our Location</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near
                Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, 110043
              </p>
            </div>

            {/* Phone */}
            <div className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FE5300] transition-all duration-300">
                <Phone className="w-7 h-7 text-[#FE5300] group-hover:text-white transition-colors duration-300" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-lg font-heading text-gray-900">Phone</h3>
              <div className="text-[13px] text-gray-500 leading-relaxed flex flex-col gap-1.5 w-full">
                <a href={`tel:${CONTACT_INFO.PHONE_NUMBER}`} className="hover:text-[#FE5300] hover:bg-orange-50 py-1.5 px-3 rounded-lg transition-colors flex justify-center items-center gap-2">
                  <span className="font-semibold text-gray-700">Tour:</span> {CONTACT_INFO.PHONE_NUMBER_FORMATTED}
                </a>
                <a href={`tel:${CONTACT_INFO.PHONE_NUMBER_SECONDARY}`} className="hover:text-[#FE5300] hover:bg-orange-50 py-1.5 px-3 rounded-lg transition-colors flex justify-center items-center gap-2">
                  <span className="font-semibold text-gray-700">Visa:</span> +91 93556 63591
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FE5300] transition-all duration-300">
                <Mail className="w-7 h-7 text-[#FE5300] group-hover:text-white transition-colors duration-300" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-lg font-heading text-gray-900">Email</h3>
              <div className="flex-1 flex items-center">
                <a href="mailto:care@musafirbaba.com" className="text-[14px] font-medium text-gray-600 hover:text-[#FE5300] transition-colors underline-offset-4 hover:underline">
                  care@musafirbaba.com
                </a>
              </div>
            </div>

            {/* Working Hours */}
            <div className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FE5300] transition-all duration-300">
                <Clock className="w-7 h-7 text-[#FE5300] group-hover:text-white transition-colors duration-300" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-lg font-heading text-gray-900">Working Hours</h3>
              <div className="text-[13px] text-gray-500 leading-relaxed flex flex-col gap-1 text-center mt-1">
                <span className="bg-gray-50 px-3 py-1 rounded-full"><strong className="text-gray-700 font-semibold">Mon-Sat:</strong> 9:00 AM - 6:00 PM</span>
                <span className="bg-gray-50 px-3 py-1 rounded-full"><strong className="text-gray-700 font-semibold">Sun:</strong> Closed</span>
              </div>
            </div>
          </div>

          {/* Form & Image Section */}
          <div className="mt-20 w-full flex flex-col lg:flex-row gap-8 bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
            <div className="w-full lg:w-5/12 relative h-64 lg:h-auto overflow-hidden">
              <Image
                className="object-cover w-full h-full transition-transform duration-700 hover:scale-105"
                src="https://cdn.musafirbaba.com/images/5561899_21273_u8g7cq.jpg"
                width={600}
                height={800}
                alt="Musafirbaba Contact Us"
              />
              {/* Optional Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
            </div>
            
            <div className="w-full lg:w-7/12 p-6 md:p-10 lg:p-12 flex flex-col justify-center">
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl md:text-3xl font-black font-heading text-gray-900">Send us a Message</h2>
                <div className="w-12 h-1 bg-[#FE5300] mx-auto lg:mx-0 mt-3 mb-4 rounded-full"></div>
                <p className="text-gray-500 text-[14px] leading-relaxed">
                  Have a question about a visa, holiday package, or rental? Fill out the form below and our dedicated support team will get back to you shortly.
                </p>
              </div>
              <div className="bg-gray-50/50 rounded-2xl p-2 md:p-4 border border-gray-100/50">
                <QueryForm />
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="w-full mt-20 flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-black font-heading text-gray-900">Find Us on the Map</h2>
              <div className="w-12 h-1 bg-[#FE5300] mx-auto mt-3 rounded-full"></div>
            </div>
            <div className="w-full border border-gray-200 shadow-lg rounded-3xl h-[450px] overflow-hidden bg-gray-100 relative group">
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.624108549693!2d76.97522459999999!3d28.611051399999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d05a3e076b787%3A0xc858632593d54601!2sMusafirBaba%20-%20Best%20Travel%20Agency%20in%20Delhi%20I%20Holidays%20I%20Visa!5e0!3m2!1sen!2sin!4v1760166725887!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: "0" }}
                loading="lazy"
                title="MusafirBaba Office Location"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default VisaWebPage;
