import { MoveRight, Globe, Newspaper, Plane, Camera, Sun } from "lucide-react";
import Link from "next/link";
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
    }
  );
  const data = await res.json();
  return data.data;
};

const iconMap = [Newspaper, Plane, Camera, Sun];

async function BlogsHome() {
  const data = await getCombinedData();
  if (!data.length) return null;

  const [featured, ...rest] = data;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row w-full md:justify-between items-start md:items-end gap-3 mb-6">
        <div className="space-y-1 flex flex-col items-start">
          <span className="text-[#FE5300] text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
            TRAVEL INTEL
          </span>
          <h2 className="text-xl md:text-[28px] font-semibold text-gray-900 tracking-tight leading-tight">
            <span className="relative inline-block whitespace-nowrap">Latest<span className="absolute -bottom-1 left-0 w-10 md:w-12 h-[3px] md:h-[4px] bg-[#FE5300] rounded-full"></span></span> travel trends and tips
          </h2>
          <p className="text-gray-500 text-[13px] md:text-[15px]">
            Read travel guides, insights, and expert tips.
          </p>
        </div>
        {/* View all */}
        <Link
          href="/blog"
          className="text-[#FE5300] font-medium hover:text-[#FE5300] transition-colors flex items-center gap-1 whitespace-nowrap text-[14px]"
        >
          View all <MoveRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="w-full border border-gray-200 rounded-2xl bg-white p-6 md:p-10 shadow-sm flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        
        {/* Left Column - List */}
        <div className="flex flex-col w-full lg:w-[45%] pb-8 lg:pb-0 lg:pr-10">
          {rest.slice(0, 4).map((blog: NewType, idx: number) => {
            const Icon = iconMap[idx % iconMap.length];
            return (
              <Link
                href={`/${blog.type}/${blog.slug}`}
                key={blog._id}
                className={`flex flex-row items-center py-4 gap-4 group hover:bg-orange-50/40 transition-colors rounded-lg px-2 -mx-2 ${
                  idx !== 3 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="w-[48px] h-[48px] shrink-0 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm group-hover:border-orange-200 group-hover:bg-white transition-all">
                  <Icon className="w-5 h-5 text-[#FE5300] stroke-[1.5]" />
                </div>
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <span className="text-[#FE5300] text-[10px] font-bold uppercase tracking-widest mb-1">
                    {blog.type == "blog" ? "BLOG" : "NEWS"}
                  </span>
                  <h3 className="font-semibold text-[15px] text-gray-900 leading-snug line-clamp-2 group-hover:text-[#FE5300] transition-colors">
                    {blog.title}
                  </h3>
                  <p className="text-[13px] text-gray-500 mt-1">
                    {new Date(blog.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Right Column - Featured */}
        <div className="w-full lg:w-[55%] flex flex-col pt-8 lg:pt-0 lg:pl-10">
          <Link
            href={`/${featured.type}/${featured.slug}`}
            className="group flex flex-col bg-white overflow-hidden h-full"
          >
            {/* Image Placeholder */}
            <div className="w-full h-[200px] md:h-[280px] bg-gray-50 flex items-center justify-center relative overflow-hidden rounded-xl border border-gray-100">
               {featured.coverImage?.url ? (
                 <Image
                   src={featured.coverImage.url}
                   alt={featured.coverImage.alt || featured.title}
                   fill
                   className="object-cover group-hover:scale-105 transition-transform duration-500"
                 />
               ) : (
                 <Globe className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
               )}
            </div>
            
            <div className="pt-6 flex flex-col flex-1 bg-white">
              <span className="text-[#FE5300] text-[11px] font-bold uppercase tracking-widest mb-2">
                {featured.type == "blog" ? "BLOG" : "NEWS"}
              </span>
              <h3 className="text-xl md:text-[26px] font-bold text-gray-900 leading-tight mb-3 group-hover:text-[#FE5300] transition-colors line-clamp-2">
                {featured.title}
              </h3>
              <p className="text-gray-600 text-[14px] md:text-[15px] leading-relaxed mb-6 line-clamp-2">
                {featured.excerpt}
              </p>
              
              <div className="mt-auto flex items-center gap-1.5 text-[#FE5300] font-medium text-[14px] md:text-[15px] group-hover:gap-2 transition-all">
                Read full article <MoveRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default BlogsHome;
