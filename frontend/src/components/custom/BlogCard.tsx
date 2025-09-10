import Image from "next/image";
import Link from "next/link";
//import { BlogContent } from "./BlogContent";

interface BlogCardProps {
  title: string;
  coverImage: string;
  description: string;
  slug: string;
}

export default function BlogCard({ title, coverImage, description, slug }: BlogCardProps) {
  return (
    <Link href={`/blog/${slug}`}>
      <div className="rounded-2xl overflow-hidden shadow hover:shadow-lg transition bg-white">
        <Image
          src={coverImage}
          alt={title}
          width={600}
          height={400}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h2 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h2>
          {/* <div className="text-gray-600 text-sm line-clamp-2"><BlogContent html={description} /></div>  */}
          <p className="text-gray-600 text-sm line-clamp-3">{description}</p>
        </div>
      </div>
    </Link>
  );
};
