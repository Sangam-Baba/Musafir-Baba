import Image from "next/image";
import LazyQueryFormInView from "./LazyQueryFormInView";
import { Phone } from "lucide-react";
import { CONTACT_INFO, getWhatsAppLink } from "@/config/contact";

// The outer container is redesigned here. The form's fields, validation and
// submit logic (QueryForm.tsx) are untouched — that component is reused
// across 7+ pages plus the sitewide MobileBottom/QueryDailogBox widgets. The
// 2-column look uses QueryForm's new opt-in "grid" variant (CSS placement
// only, same fields/logic). In "grid" mode QueryForm doesn't render its own
// submit button — this file renders it instead, linked back to the form via
// the standard HTML `form="..."` attribute, so it can sit in its own column
// exactly like the reference. Every other QueryForm caller keeps its own
// built-in button, unaffected.
const ENQUIRY_FORM_ID = "section-five-enquiry-form";

function SectionFive() {
  return (
    <section className="w-full bg-white px-4 md:px-10 py-8 md:py-10">
      <div className="w-full max-w-7xl mx-auto border border-gray-100 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-[0_2px_16px_rgba(254,83,0,0.05)]">
        {/* Left: intro panel — ~1/4 width */}
        <div className="md:w-1/4 flex-shrink-0 bg-[#fef9f5] p-6 md:p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-[24px] md:text-[26px] font-bold text-gray-900 leading-tight mb-3">
              Plan your trip with our <span className="text-[#FE5300]">travel</span> experts!
            </h2>
            <p className="text-[13.5px] text-gray-600 leading-relaxed">
              Share your details and we&apos;ll get back to you with the best travel options.
            </p>
          </div>
          <div className="mt-4 flex justify-center w-full">
            <Image
              src="/queryformimg.png"
              alt="Plan your trip"
              width={400}
              height={200}
              className="w-full h-auto max-w-full object-contain"
            />
          </div>
        </div>

        {/* Middle: the real, unmodified enquiry form — ~1/2 width */}
        <div className="md:w-2/4 p-8 md:p-10 bg-white">
          <LazyQueryFormInView variant="grid" formId={ENQUIRY_FORM_ID} />
        </div>

        {/* Right: submit button (linked to the form above by id) + real
            contact info — ~1/4 width */}
        <div className="md:w-1/4 flex-shrink-0 bg-white p-8 md:p-10 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col justify-center items-center">
          <button
            type="submit"
            form={ENQUIRY_FORM_ID}
            className="w-full bg-[#FE5300] hover:bg-[#e04800] text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 mb-8 transform hover:-translate-y-0.5"
          >
            SEND ENQUIRY
          </button>

          <div className="w-full flex items-center gap-3 mb-8">
            <span className="h-px bg-gray-200 flex-1" />
            <span className="text-[12px] text-gray-400 uppercase font-medium">Or</span>
            <span className="h-px bg-gray-200 flex-1" />
          </div>

          <div className="text-center w-full">
            <p className="text-gray-600 font-medium mb-3 text-[14px]">Talk to our travel expert</p>
            <a
              href={`tel:${CONTACT_INFO.PHONE_NUMBER}`}
              className="flex items-center justify-center gap-3 text-[18px] font-bold text-[#FE5300] hover:text-[#e04800] transition-colors group"
            >
              <span className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                <Phone className="w-3.5 h-3.5" />
              </span>
              {CONTACT_INFO.PHONE_NUMBER_FORMATTED}
            </a>
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="block text-[11px] text-gray-400 mt-4 hover:text-[#25D366] transition-colors"
            >
              24/7 available on Call &amp; WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SectionFive;
