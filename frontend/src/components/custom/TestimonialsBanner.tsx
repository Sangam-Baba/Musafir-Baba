import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import badrinath from "../../../public/badrinath.jpg";
import kashmir from "../../../public/kashmir.jpg";
import himachal from "../../../public/Himachal.jpg";
import jaipur from "../../../public/jaipur.jpg";

// Homepage-only replacement for the shared Testimonial component
// (components/custom/Testimonial.tsx, rendered via LazyTestimonial) — that
// file stays untouched since it's also used on about-us, holiday/visa detail
// pages, travel-agency, itinerary templates, and the admin webpage builder.
// This is a new, isolated component; page.tsx no longer calls
// <LazyTestimonial data={testi} /> but the testi data + LazyCarousels export
// are both left in place, unused, for the same reason.

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-[1px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < count ? "fill-[#FBBC05] text-[#FBBC05]" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </div>
  );
}

// Same "colored circle + initial" avatar pattern already used in the real
// Testimonial.tsx — no stock/placeholder photos of people who don't exist.
const REVIEWS = [
  { initials: "NA", color: "bg-[#d93025]", name: "Neha & Arjun", trip: "Manali Trip", quote: "It was the best decision we made. Everything was perfectly planned." },
  { initials: "AM", color: "bg-[#1967d2]", name: "Anjali Mehta", trip: "Kashmir Trip", quote: "Superb experience, amazing support throughout the trip." },
  { initials: "TK", color: "bg-[#e37400]", name: "The Kapoor Family", trip: "Goa Trip", quote: "Great services for family trips. Highly recommended!" },
];

// Real destination photography already used elsewhere in the app (same
// files ExploreDestinationsPanel.tsx imports) — swapped in after checking
// the previous frame*.webp picks were adventure-sport action shots with
// people's faces in them, nothing like the serene temple/lake photography
// this section is supposed to show.
const GALLERY = [
  { src: badrinath, alt: "Kedarnath temple in the Himalayas" },
  { src: kashmir, alt: "Shikara boat on Dal Lake" },
  { src: himachal, alt: "Key Monastery in Spiti Valley" },
  { src: jaipur, alt: "Amber Fort at dusk" },
];

export default function TestimonialsBanner() {
  return (
    <section className="w-full px-4 md:px-10 py-8 md:py-10">
      <div className="max-w-7xl mx-auto bg-[#FAFAFB] border border-gray-100 rounded-[24px] p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-center">
          {/* Left: heading + Google rating */}
          <div className="lg:w-[220px] flex-shrink-0 flex flex-col gap-4">
            <h2 className="text-[20px] md:text-[22px] font-bold text-gray-900 leading-snug">
              Real Stories. <span className="text-[#FE5300]">Real Happiness.</span>
            </h2>

            <div className="flex items-center gap-2">
              <GoogleIcon />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[17px] font-bold text-gray-900">4.8</span>
                  <Stars count={5} />
                </div>
                <span className="text-[11px] text-gray-500">(300+ Reviews)</span>
              </div>
            </div>

            {/* Real Place ID, same business as the Google Maps embed on
                app/(user)/contact-us/page.tsx — not a placeholder link */}
            <a
              href="https://www.google.com/maps?cid=14436397618581292545"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="text-[12px] font-semibold text-gray-700 hover:text-[#FE5300] transition-colors inline-flex items-center gap-1.5"
            >
              <span>Read our reviews on Google</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Middle: testimonial cards */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0 ${r.color}`}>
                    {r.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-gray-900 leading-tight truncate">{r.name}</p>
                    <p className="text-[11px] text-gray-500 leading-tight">{r.trip}</p>
                  </div>
                </div>
                <Stars count={5} />
                <p className="text-[12px] text-gray-600 leading-relaxed">{r.quote}</p>
              </div>
            ))}
          </div>

          {/* Right: image gallery */}
          <div className="lg:w-[300px] flex-shrink-0 grid grid-cols-2 gap-2">
            {GALLERY.map((g) => (
              <div key={g.alt} className="relative aspect-square rounded-xl overflow-hidden">
                <Image src={g.src} alt={g.alt} fill className="object-cover" sizes="150px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
