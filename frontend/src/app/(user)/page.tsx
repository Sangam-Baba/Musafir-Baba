import SecondSection from "../../components/custom/SecondSection";
import SectionFour from "../../components/custom/SectionFour";
import SectionFive from "../../components/custom/SectionFive";
import { Testimonial } from "../../components/custom/Testimonial";
import { ImageGallery } from "../../components/custom/ImageGallery";
import { SevenSection } from "../../components/custom/SevenSection";
import { DestinationSection } from "../../components/custom/DestinationSection";
import { Faqs } from "../../components/custom/Faqs";
import FeaturedTourSSG from "../../components/custom/FeaturedTourSSG";
import SearchBanner from "@/components/custom/Search";
import ThirdSection from "@/components/custom/ThirdSection";
import BlogsHome from "@/components/custom/BlogsHome";
// import Image from "next/image";
import HomeBooking from "../../components/custom/HomeBooking";
import VisaHome from "@/components/custom/VisaHome";
import VideoSection from "@/components/custom/VideoSection";
import Newslatter from "@/components/common/Newslatter";

const faqs = [
  {
    id: 1,
    question: "What services does Musafirbaba offer?",
    answer:
      "We provide end-to-end travel solutions including tourist visas (Singapore, Dubai, Schengen, USA), domestic & international tour packages, flight & hotel bookings, and personalized travel planning for individuals, families, and groups.",
  },
  {
    id: 2,
    question: "What tour packages do you offer?",
    answer:
      "We offer domestic tours like Rajasthan, Kerala, Himachal, Kashmir, Goa, and international tours including Dubai, Singapore, Thailand, Europe, and Maldives, with customized options for honeymoon, family, group, and corporate trips.",
  },
  {
    id: 3,
    question: "What makes Musafirbaba different from others?",
    answer:
      "With 10,000+ happy travelers, 4.8★ Google rating, expert visa consultants, best prices, 24/7 support, and total transparency, we offer both visa and tour services under one roof with guaranteed satisfaction.",
  },
  {
    id: 4,
    question: "Is there a cancellation fee & refund policy?",
    answer:
      "Yes, we have clear cancellation and refund policies; full details are available in our Terms & Conditions.",
  },
  {
    id: 5,
    question: "How can I check tour availability and prices?",
    answer:
      "You can check availability and get instant pricing by visiting our website, contacting us via call or WhatsApp, or emailing our travel experts.",
  },
  {
    id: 6,
    question: "Do you provide 24/7 customer support?",
    answer:
      "Yes, we provide 24/7 customer support throughout your journey via phone, WhatsApp, and email to ensure a hassle-free travel experience.You can reach us at +91 92896 02447",
  },
];

export default function HomePage() {
  return (
    <main className="">
      <section
        className="w-full flex px-4 md:px-8 lg:px-20 py-16 relative bg-cover bg-center bg-no-repeat text-white h-[400px] md:h-[500px] 2xl:h-[800px] items-center"
        style={{
          backgroundImage: `url(${"/bannerImage.webp"})`,
        }}
      >
        <div className="absolute inset-0 bg-black/10 z-10  left-0"></div>
        <div className="flex flex-col md:gap-10 gap-4 items-center md:items-start z-10 w-[60%] md:w-[40%] lg:w-[30%] relative ">
          {/* <Image
            className="w-full  object-cover"
            src="/Musafir-Baba-text.png"
            width={400}
            height={127}
            alt="Musafirbaba"
            priority
            fetchPriority="high"
          /> */}
          <div className="text-center flex flex-col items-center justify-center">
            <h1 className="text-2xl md:text-4xl  font-bold text-[#112A46]  text-inline leading-tight">
              Book your trip in just
            </h1>
            <p
              className="text-white text-2xl md:text-4xl  font-bold text-inline leading-tight tracking-wide"
              style={{
                textShadow:
                  "-1px -1px 0 #112A46, 1px -1px 0 #112A46, -1px 1px 0 #112A46, 1px 1px 0 #112A46",
              }}
            >
              60 seconds
            </p>
          </div>

          <div className="relative z-20 w-full overflow-visible">
            <SearchBanner />
          </div>
          <div className="relative z-20 w-full overflow-visible">
            <SecondSection />
          </div>
        </div>
      </section>
      <VisaHome />
      {/* <ThirdSection /> */}
      <SevenSection />

      <FeaturedTourSSG />
      <SectionFour />
      <SectionFive />
      <DestinationSection />
      <VideoSection />
      <Testimonial />
      <ImageGallery />
      <HomeBooking />
      <BlogsHome />
      <Newslatter />
      <Faqs faqs={faqs} />
    </main>
  );
}
