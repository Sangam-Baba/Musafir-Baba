import { Card, CardContent } from "../ui/card";
import Image from "next/image";
import Link from "next/link";
import { readingTime } from "@/utils/readingTime";
interface Blog {
  _id: string;
  title: string;
  content: string;
  excerpt: string;
  coverImage: {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  slug: string;
  updatedAt: string;
  createdAt: string;
  fullSlug: string;
}
interface ListBlogSidebarProps {
  blogs: Blog[];
  title: string;
  type: string;
}
function RelatedWebpage({ blogs, title, type }: ListBlogSidebarProps) {
  return (
    <Card className="mt-10 ">
      <div className="flex w-full justify-between gap-2 px-5">
        <div>
          <h3 className="text-xl  font-bold">{title}</h3>
        </div>
      </div>
      <div className=" flex flex-col gap-4 px-2">
        {blogs.slice(0, 10).map((blog) => (
          <Card
            key={blog._id}
            className="flex flex-row items-center px-2 py-2 gap-2 border-none shadow-none "
          >
            <div className="relative w-[120px] h-[80px] shrink-0">
              <Image
                src={blog.coverImage.url}
                alt={blog.coverImage.alt || blog.title}
                fill
                unoptimized
                className="rounded-md object-cover border border-gray-200"
              />
            </div>
            <CardContent className="p-2">
              <Link
                href={`/${blog.fullSlug}`}
                className="font-semibold text-sm line-clamp-2 hover:text-[#FE5300]"
              >
                {blog.title}
              </Link>
              {type === "latest" && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(blog.createdAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  <span className="text-[#FE5300] font-semibold ">|</span>{" "}
                  {readingTime(blog.content || "")} Min Read
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* </div> */}
    </Card>
  );
}

export default RelatedWebpage;
