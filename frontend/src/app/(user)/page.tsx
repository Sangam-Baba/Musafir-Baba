import SectionFour from "../../components/custom/SectionFour";
import SectionFive from "../../components/custom/SectionFive";
import { Testimonial } from "../../components/custom/Testimonial";
import { ImageGallery } from "../../components/custom/ImageGallery";
import { SevenSection } from "../../components/custom/SevenSection";
import { DestinationSection } from "../../components/custom/DestinationSection";
import { Faqs } from "../../components/custom/Faqs";
import FeaturedTourSSG from "../../components/custom/FeaturedTourSSG";
import SearchBanner from "@/components/custom/Search";
import BlogsHome from "@/components/custom/BlogsHome";
import HomeBooking from "../../components/custom/HomeBooking";
import VisaHome from "@/components/custom/VisaHome";
import VideoSection from "@/components/custom/VideoSection";
import WhyChoose from "@/components/custom/WhyChoose";
import Image from "next/image";
import SecondSectionServer from "@/components/custom/SecondSectionServer";
import LoginAutoOpen from "@/components/User/LoginAutoOpen";

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
const testi = [
  {
    id: 1,
    name: "Poonom Ranjan",
    location: "Traveler",
    comment: `Musafirbaba provided excellent service in a highly professional manner. They went above and beyond to assist me, and I want to give a special shoutout to Anu, my tour manager.`,
  },
  {
    id: 2,
    name: "Anupam Ray",
    location: "Traveler",
    comment: `I loved booking through Musafirbaba. I have recommended them to so many people! Great deals, easy to get things organised, had a great experience.`,
  },
  {
    id: 3,
    name: "Rohit Singh",
    location: "Traveler",
    comment:
      "Booking with Musafir Baba was the best decision for our family trip. Everything was perfectly organized — from comfortable stays to local guides who truly knew the hidden gems.",
  },
  {
    id: 4,
    name: "Shubham Sharma",
    location: "Traveler",
    comment:
      "I was amazed at how easy Musafir Baba made the entire process. The itinerary was well-balanced, giving me enough time to explore and relax. It felt like I had a personal travel partner by my side throughout the journey.",
  },
  {
    id: 5,
    name: "Dr. Ritu Mishra",
    location: "Traveler",
    comment:
      "The team at Musafir Baba is incredibly professional yet so friendly. They were always available for any questions, and every little detail was taken care of. I’ll definitely be planning my next trip with them again!",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth: string }>;
}) {
  const { auth } = (await searchParams) || null;
  // console.log("auth", auth);
  return (
    <main className="">
      <section className="w-full flex px-4 md:px-8 lg:px-30 py-16 relative bg-cover bg-center bg-no-repeat text-white h-[400px] md:h-[600px] 2xl:h-[800px] items-center">
        <Image
          src="/homebanner.webp"
          alt="Home Banner MusafirBaba"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
        />
        {/* <div className="absolute inset-0  z-10  bg-gradient-to-r from-black/20 to-transparent"></div> */}
        <div className="flex flex-col ml-10 md:gap-10 gap-4 items-center  z-10 w-[80%] md:w-[60%] lg:w-[55%] xl:w-[50%] relative ">
          <div className="text-center flex flex-col items-center justify-center">
            <h1
              className={`text-xl font-poppins font-extrabold md:text-2xl lg:text-4xl xl:text-5xl text-inline leading-tight`}
            >
              <span className="whitespace-nowrap">
                Book your <span className="text-[#74ff18]">dream trip</span> in
                just
              </span>
              <br />
              <span> 60 seconds</span>
            </h1>
            <p className="hidden md:block text-sm md:text-md xl:text-lg mt-1 font-poppins ">
              Get curated tours & seamless visa assistance - all in one place
            </p>
          </div>

          <div className="relative z-20 w-4/5 md:w-3/5   overflow-visible">
            <SearchBanner />
          </div>
        </div>
      </section>
      <SecondSectionServer />
      <VisaHome />
      <SevenSection />
      <FeaturedTourSSG />
      <SectionFour />
      <SectionFive />
      <DestinationSection />
      <VideoSection />
      <WhyChoose />
      <Testimonial data={testi} />
      <ImageGallery
        title="Memories in Motion"
        description="Picture Perfect Moments with the Best Travel Agency in India"
      />
      <HomeBooking />
      <BlogsHome />
      <Faqs faqs={faqs} />
      <LoginAutoOpen auth={auth} />
    </main>
  );
}
