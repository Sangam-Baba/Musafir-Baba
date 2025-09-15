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
    question: "Can I book with a credit card?",
    answer: "Yes, you can book with a credit card. We accept major credit cards, including Visa, Mastercard, and American Express.",    
  },
  {
    id: 2,
    question: "Is there a cancellation fee?",
    answer: "No, there is no cancellation fee. You can cancel your booking at any time before your trip starts.",    
  },
  {
    id: 3,
    question: "What is your refund policy?",    
    answer: "We offer a 100% refund within 24 hours of cancellation. Please contact us for details.",    
  },    
  {
    id: 4,
    question: "Can I book with a credit card?",
    answer: "Yes, you can book with a credit card. We accept major credit cards, including Visa, Mastercard, and American Express.",    
  },    
  {
    id: 5,
    question: "Is there a cancellation fee?",
    answer: "No, there is no cancellation fee. You can cancel your booking at any time before your trip starts.",    
  },    
  {
    id: 6,
    question: "What is your refund policy?",    
    answer: "We offer a 100% refund within 24 hours of cancellation. Please contact us for details.",    
  },    
]

export default function HomePage() {

  return (
    <main className="">
      <div className="relative">
          <div className="absolute z-20 w-full flex justify-center bottom-4 px-4">
           <Search />
         </div>
        <Hero
         image={heroimg.src}
         title="Dream. Explore. Discover. With Musafirbaba."
         description="Looking for best travel agency in Delhi? Musafirbaba offers expertly crafted tour packages for unfoegetble tarvel experienc. Let's plan your tour"
         align="left"
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
