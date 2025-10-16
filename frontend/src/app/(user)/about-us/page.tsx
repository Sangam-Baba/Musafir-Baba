import { Metadata } from "next";
import AboutUsPageClient from "./pageClient";

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
    `${process.env.NEXT_PUBLIC_BASE_URL}/aboutus/68e8f5bee2f305d5077f7a99`
  );
  if (!res.ok) throw new Error("Failed to fetch about");
  const data = await res.json();
  console.log("About us data", data);
  return data;
};

export async function generateMetadata(): Promise<Metadata> {
  const page = await getWebPageBySlug();
  const about = page?.data || {};
  return {
    title: about?.metaTitle || page?.title,
    description: about?.metaDescription,
    keywords: about?.keywords,
    openGraph: {
      title: about?.metaTitle || page?.title,
      description: about?.metaDescription,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/about-us`,
      type: "website",
    },
  };
}

function AboutUsPage() {
  return <AboutUsPageClient />;
}

export default AboutUsPage;
