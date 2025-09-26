"use client";

import Hero from "../../components/custom/Hero";
import SecondSection from "../../components/custom/SecondSection";
import heroimg from '../../../public/Heroimg.jpg';
import SectionFour from "../../components/custom/SectionFour";
import SectionFive from "../../components/custom/SectionFive";
import {Testimonial} from "../../components/custom/Testimonial";
import {ImageGallery} from "../../components/custom/ImageGallery";
import {BusBooking} from "../../components/custom/BusBooking";
import {SevenSection} from "../../components/custom/SevenSection";
import {DestinationSection} from "../../components/custom/DestinationSection";
import {Faqs} from "../../components/custom/Faqs";
import {FeaturedTour} from "../../components/custom/FeaturedTour";
import Search from "@/components/custom/Search";
import ThirdSection from "@/components/custom/ThirdSection";
import BlogsHome from "@/components/custom/BlogsHome";


const faqs = [
  {
    id: 1,
    question: "What services does Musafirbaba offer?",
    answer: "We provide end-to-end travel solutions including tourist visas (Singapore, Dubai, Schengen, USA), domestic & international tour packages, flight & hotel bookings, and personalized travel planning for individuals, families, and groups.",    
  },
  {
    id: 2,
    question: "What tour packages do you offer?",
    answer: "We offer domestic tours like Rajasthan, Kerala, Himachal, Kashmir, Goa, and international tours including Dubai, Singapore, Thailand, Europe, and Maldives, with customized options for honeymoon, family, group, and corporate trips.",    
  },
  {
    id: 3,
    question: "What makes Musafirbaba different from others?",    
    answer: "With 10,000+ happy travelers, 4.8★ Google rating, expert visa consultants, best prices, 24/7 support, and total transparency, we offer both visa and tour services under one roof with guaranteed satisfaction.",    
  },    
  {
    id: 4,
    question: "Is there a cancellation fee & refund policy?",
    answer: "Yes, we have clear cancellation and refund policies; full details are available in our Terms & Conditions.",    
  },    
  {
    id: 5,
    question: "How can I check tour availability and prices?",
    answer: "You can check availability and get instant pricing by visiting our website, contacting us via call or WhatsApp, or emailing our travel experts.",    
  },    
  {
    id: 6,
    question: "Do you provide 24/7 customer support?",    
    answer: "Yes, we provide 24/7 customer support throughout your journey via phone, WhatsApp, and email to ensure a hassle-free travel experience.You can reach us at +91 92896 02447",    
  },    
]

export default function HomePage() {

  return (
    <main className="">
      <div className="relative">
          <div className="absolute z-20 w-full flex justify-center bottom-35 px-4">
           <Search />
         </div>
        <Hero
         image={heroimg.src}
         title="Dream. Explore. Discover. With Musafirbaba."
         description="Looking for best travel agency in Delhi? Musafirbaba offers expertly crafted tour packages for unforgettable travel experience. Let's plan your tour."
         align="center"
         height="xl"
         overlayOpacity={40}
        />
      </div>
      <SecondSection />
      <ThirdSection />
      <SectionFour />
      <SectionFive />
      <FeaturedTour />
      <SevenSection />
      <DestinationSection />
      <ImageGallery />
      <BusBooking />
      <Testimonial />
      <BlogsHome />
      <Faqs faqs={faqs} />
    </main>
  );
}
