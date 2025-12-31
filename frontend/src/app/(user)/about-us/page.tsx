import { Metadata } from "next";
import AboutUsPageClient from "./pageClient";
import BlogsHome from "@/components/custom/BlogsHome";
import { Testimonial } from "@/components/custom/Testimonial";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import Script from "next/script";

interface ImageType {
  url: string;
  alt: string;
  public_id?: string;
  width?: number;
  height?: number;
}

interface Content {
  title: string;
  description: string;
  image: ImageType;
}

interface FormValues {
  _id: string;
  title: string;
  description: string;
  schemaType: string[];
  upperImage: ImageType[];
  lowerImage: ImageType[];
  coverImage: ImageType;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  h2title: string;
  h2description: string;
  h2content: Content[];
}

// Fetch Function
const getWebPageBySlug = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/aboutus/68e8f5bee2f305d5077f7a99`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error("Failed to fetch about");
  const data = await res.json();
  return data?.data as FormValues;
};

export async function generateMetadata(): Promise<Metadata> {
  const page = await getWebPageBySlug();
  const about = page || {};

  return {
    title: about?.metaTitle || page?.title,
    description: about?.metaDescription,
    keywords: about?.keywords,
    alternates: {
      canonical: `https://musafirbaba.com/about-us`,
    },
    openGraph: {
      title: about?.metaTitle || page?.title,
      description: about?.metaDescription,
      url: `https://musafirbaba.com/about-us`,
      type: "website",
      images:
        about?.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
    },
  };
}

async function AboutUsPage() {
  const data = await getWebPageBySlug();
  const schema = getWebPageSchema("About Us", "about-us");
  const breadcrumb = getBreadcrumbSchema("about-us");
  return (
    <div>
      <AboutUsPageClient about={data} />
      {/* Testimonials and Blogs */}
      <Testimonial data={[]} />
      <BlogsHome />

      <Script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* {data.schemaType.includes("Webpage") && ( */}
      <Script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* )} */}
    </div>
  );
}

export default AboutUsPage;
