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
  views: number;
}
interface ListBlogSidebarProps {
  blogs: Blog[];
  title: string;
  type: string;
  url: string;
}
function LatestBlog({ blogs, title, type, url }: ListBlogSidebarProps) {
  return (
    <Card className="">
      <div className="flex w-full justify-between gap-2 px-5">
        <div>
          <h3 className="text-xl  font-bold">{title}</h3>
          <p className="w-[25%] h-1 rounded-md bg-[#FE5300]"></p>
        </div>
      </div>
      <div className=" grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
        {blogs.slice(0, 4).map((blog) => (
          <Card
            key={blog._id}
            className="flex flex-row items-center px-2 py-2 gap-2 border-none shadow-none "
          >
            <Image
              src={blog.coverImage.url}
              alt={blog.coverImage.alt || blog.title}
              width={120}
              height={80}
              className="rounded-md w-[120px] h-20 object-cover border border-gray-200"
            />
            <CardContent className="p-2">
              <Link
                href={`/${url}/${blog.slug}`}
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
              {type === "trending" && (
                <p className="text-xs text-gray-500 mt-1">
                  Views: {blog.views + 1000}{" "}
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

export default LatestBlog;
