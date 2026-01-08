import Image from "next/image";
import Link from "next/link";
export default function ThankYouPage() {
  return (
    <section className="flex flex-col items-center justify-around md:min-h-[80vh]  w-full ">
      {/* Content */}
      <div className="flex flex-col items-center text-center px-6 mt-4">
        <h1 className="text-4xl md:text-6xl font-extrabold text-[#FE5300] mb-4">
          Thank You!
        </h1>
        <p className="text-gray-700 text-lg md:text-xl max-w-xl mx-auto">
          We’ve received your submission successfully. Our team will get back to
          you shortly.
        </p>

        {/* Optional: Add a button to go back or explore more */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#FE5300] text-white font-medium rounded-full hover:bg-[#e24a00] transition-all duration-300 shadow-md"
          >
            Go Back Home
          </Link>
        </div>
      </div>
      {/* Background Image */}
      <Image
        src="https://cdn.musafirbaba.com/images/vector-for-sangam-3_ubl8gh.png"
        alt="Thank You Musafirbaba"
        width={1000}
        height={1000}
        className="object-cover w-full  md:h-[60vh]   "
      />
    </section>
  );
}
