import Image from "next/image";
import Link from "next/link";
import Breadcrumb from "@/components/common/Breadcrumb";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import Script from "next/script";
import { getCollectionSchema } from "@/lib/schema/collection.schema";

interface AuthoreInterface {
  name: string;
  about: string;
  avatar: {
    url: string;
  };
  slug: string;
}

const getAllAuthor = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/authors`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
};
export async function generateMetadata() {
  return {
    title: "Meet Our Authors: MusafirBaba's Editorial Team",
    description:
      "Here is the team of seasoned content writers at MusafirBaba with years of experience and expertise in Travel and Tourism along with visa and immigration domains.",
    alternates: {
      canonical: `https://musafirbaba.com/author`,
    },
    openGraph: {
      title: null,
      description: null,
      url: `https://musafirbaba.com/author`,
      type: "website",
      images: null,
    },
  };
}

export default async function BookingIndexPage() {
  const allAuthor = await getAllAuthor();
  const breadcrumbSchema = getBreadcrumbSchema("author");
  const collectionSchema = getCollectionSchema(
    "Author",
    "https://musafirbaba.com/author",
    allAuthor.map((blog: AuthoreInterface) => ({
      url: `https://musafirbaba.com/author/${blog.slug}`,
    }))
  );
  return (
    <div className="mt-10 mx-auto max-w-7xl px-5">
      {/* Breadcrumb */}
      <div className="w-full md:max-w-7xl mx-auto  mt-5">
        <Breadcrumb />
      </div>
      <div>
        <h1 className="font-semibold text-xl md:text-2xl">
          MusafirBaba Authors
        </h1>
      </div>

      {allAuthor?.length > 0 ? (
        allAuthor.map((author: AuthoreInterface, i: number) => {
          return (
            <div
              key={i}
              className="mt-10 mx-auto max-w-7xl px-8 py-8 md:px-12 md:py-12 border border-gray-200 shadow-md rounded-2xl bg-white flex flex-col md:flex-row items-center md:items-start gap-8"
            >
              {/* Author Image */}
              <div className="flex-shrink-0">
                <Image
                  src={author.avatar?.url || "/avatar.png"}
                  alt="MusafirBaba author image"
                  width={200}
                  height={200}
                  className="rounded-xl object-cover "
                />
              </div>

              {/* Author Info */}
              <div className="text-center md:text-left space-y-3">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {author.name}
                </h2>
                <p className="text-gray-600 leading-relaxed">{author.about}</p>
                <Link
                  href={`/author/${author.slug}`}
                  className="hover:text-blue-600"
                >
                  Read Articles
                </Link>
              </div>
            </div>
          );
        })
      ) : (
        <div>
          <p>Sorry No Author Found</p>
        </div>
      )}
      <Script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        key="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
    </div>
  );
}
