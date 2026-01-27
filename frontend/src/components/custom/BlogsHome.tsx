import { MoveRightIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../ui/card";
import Image from "next/image";
import { News } from "@/app/(user)/news/page";

interface NewType extends News {
  type: string;
}
const getCombinedData = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/combined-news-blog`,
    {
      next: { revalidate: 360 },
    },
  );
  const data = await res.json();
  return data.data;
};

async function BlogsHome() {
  const data = await getCombinedData();
  if (!data.length) return null;

  const [featured, ...rest] = data;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-20 py-4 md:py-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row w-full md:justify-between gap-2  mb-10">
        <div className="space-y-2 flex flex-col items-center md:items-start">
          <h2 className="text-lg md:text-3xl font-bold">
            Latest Travel Trends & Tips
          </h2>
          <p className="w-20 h-1 bg-[#FE5300] mt-2"></p>
          <p>Read travel guides, insights, and expert tips.</p>
        </div>
        {/* View all */}
        <div className="flex gap-2 md:items-center justify-end">
          <Link
            href="/blog"
            className="text-[#FE5300] font-semibold whitespace-nowrap"
          >
            View all
          </Link>
          <MoveRightIcon className="w-4 h-4 text-[#FE5300]" />
        </div>
      </div>

      <div className="w-full flex flex-col-reverse md:flex-row gap-6 justify-between items-center">
        <div className="md:w-1/2 w-full flex md:flex-col gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory ">
          {rest.slice(0, 4).map((blog: NewType) => (
            <Card
              key={blog._id}
              className="flex min-w-[300px] flex-row items-center px-2 py-2 gap-2 rounded-xl shadow hover:shadow-lg transition  snap-start"
            >
              <Image
                src={blog.coverImage.url}
                alt={blog.coverImage.alt || blog.title}
                width={120}
                height={80}
                className="w-[120px] h-[80px] rounded-md object-cover"
              />
              <CardContent className="p-2">
                <Link
                  href={`/${blog.type}/${blog.slug}`}
                  className="font-semibold text-sm line-clamp-2 hover:text-[#FE5300]"
                >
                  {blog.title}
                </Link>
                <p className="text-xs text-gray-500 mt-1 flex gap-2 items-center ">
                  {new Date(blog.createdAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {"  "}
                  <span className="w-1.5 h-1.5 inline-block bg-[#FE5300] rounded-full "></span>{" "}
                  <span className="font-semibold">
                    {blog.type == "blog" ? "Blog" : "News"}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  {blog.excerpt}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="md:w-1/2">
          <Card className="flex justify-center ietms-center rounded-xl shadow hover:shadow-lg transition py-2 px-2 ">
            <Image
              src={featured.coverImage.url}
              alt={featured.coverImage.alt || featured.title}
              width={530}
              height={150}
              className="rounded-xl object-cover w-full md:h-80 h-50"
            />
            <CardContent className="">
              <Link
                href={`/${featured.type}/${featured.slug}`}
                className="text-lg md:text-xl font-semibold hover:text-[#FE5300]"
              >
                {featured.title}
              </Link>
              <p className="text-xs text-gray-500 mt-2 flex gap-2 items-center">
                {new Date(featured.createdAt).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
                {"  "}
                <span className="w-1.5 h-1.5 inline-block bg-[#FE5300] rounded-full"></span>{" "}
                <span className="font-semibold">
                  {featured.type == "blog" ? "Blog" : "News"}
                </span>
              </p>
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                {featured.excerpt}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default BlogsHome;
