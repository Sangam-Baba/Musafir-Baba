"use client";

// import { useQuery } from "@tanstack/react-query";
// import { useAuthStore } from "@/store/useAuthStore";
// import { useUIStore } from "@/store/useUIStore";
// import { Button } from "@/components/ui/button";
import Hero from "../components/custom/Hero";
import SecondSection from "../components/custom/SecondSection";
import CategoryGrid from "../components/custom/CategoryGrid";
import img1 from "../../public/Hero1.jpg";
import img2 from "../../public/Hero2.jpg";
import img3 from "../../public/Hero3.jpg";
import heroimg from '../../public/Heroimg.jpg';
import SectionFour from "../components/custom/SectionFour";
import SectionFive from "../components/custom/SectionFive";
import {Testimonial} from "../components/custom/Testimonial";
import {ImageGallery} from "../components/custom/ImageGallery";
import {BusBooking} from "../components/custom/BusBooking";
import {SevenSection} from "../components/custom/SevenSection";
import {DestinationSection} from "../components/custom/DestinationSection";
import {Faqs} from "../components/custom/Faqs";
import {FeaturedTour} from "../components/custom/FeaturedTour";
const dummyCategories = [
  {
    id: "1",
    name: "Adventure",
    slug: "adventure",
    image: img1.src,
    description: "Thrilling treks, safaris, and outdoor activities."
  },
  {
    id: "2",
    name: "Pilgrimage",
    slug: "pilgrimage",
    image: img2.src,
    description: "Spiritual journeys to holy destinations."
  },
  {
    id: "3",
    name: "Luxury",
    slug: "luxury",
    image: img3.src,
    description: "Premium experiences and 5-star stays."
  },
  {
    id: "4",
    name: "Beaches",
    slug: "beaches",
    image: img2.src,
    description: "Relaxing getaways by the sea."
  },
]

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
    <main className="py-8">
<Hero
  image={heroimg.src}
  title="Find Your Perfect Getaway"
  description="Curated itineraries, flexible dates, and best-price guarantees."
  align="center"
  height="xl"
  overlayOpacity={0}
/>
      <SecondSection />
       <CategoryGrid 
        categories={dummyCategories} 
        limit={4} 
        title="Find Your Perfect Getaway with the Best Travel Agency in Delhi" 
        url="/packages"
      />
      <SectionFour />
      <SectionFive />
      <FeaturedTour />
      <SevenSection />
      <DestinationSection />
      <ImageGallery />
      <BusBooking />
      <Testimonial />
      <Faqs faqs={faqs} />
    </main>
  );
}
