import { Card, CardContent } from "../ui/card";
import Image from "next/image";
import Link from "next/link";
import { readingTime } from "@/utils/readingTime";
interface TrandingPkgInterface {
  _id: string;
  title: string;
  coverImage: {
    url: string;
    alt: string;
  };
  mainCategory: {
    slug: string;
  };
  slug: string;
  batch: {
    quad: number;
  }[];
  destination: {
    state: string;
  };
}
interface ListBlogSidebarProps {
  pkgs: TrandingPkgInterface[];
  title: string;
}
function TrandingPkgSidebar({ pkgs, title }: ListBlogSidebarProps) {
  return (
    <Card className="mt-10 ">
      <div className="flex w-full justify-between gap-2 px-5">
        <div>
          <h3 className="text-xl  font-bold">{title}</h3>
        </div>
      </div>
      <div className=" flex flex-col gap-4 px-2">
        {pkgs.slice(0, 5).map((blog) => (
          <Card
            key={blog._id}
            className="flex flex-row items-center px-2 py-2 gap-2 border-none shadow-none "
          >
            <Image
              src={blog.coverImage.url}
              alt={blog.coverImage.alt || blog.title}
              width={1200}
              height={800}
              className="rounded-md w-[120px] h-[80px] object-cover border border-gray-200"
            />
            <CardContent className="p-2">
              <Link
                href={`/holidays/${blog.mainCategory.slug}/${blog.destination.state}/${blog.slug}`}
                className="font-semibold text-sm line-clamp-2 hover:text-[#FE5300]"
              >
                {blog.title}
              </Link>
              <p className="text-xs text-gray-500 mt-1">
                Starts from{" "}
                <span className="text-primary">
                  ₹{blog.batch[0].quad.toLocaleString()}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* </div> */}
    </Card>
  );
}

export default TrandingPkgSidebar;
