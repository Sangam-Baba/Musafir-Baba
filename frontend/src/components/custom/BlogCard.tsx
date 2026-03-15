import Image from "next/image";
import Link from "next/link";
//import { BlogContent } from "./BlogContent";

interface BlogCardProps {
  type: string;
  title: string;
  coverImage: string;
  description: string;
  slug: string;
}

export default function BlogCard({
  title,
  coverImage,
  description,
  slug,
  type,
}: BlogCardProps) {
  return (
    <Link href={`/${type}/${slug}`}>
      <div className="rounded-2xl overflow-hidden shadow hover:shadow-lg transition bg-white relative">
        <Image
          src={coverImage}
          alt={title}
          width={600}
          height={400}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 to-transparent" />
        <div className="absolute bottom-2 left-4 right-4 text-white">
          <h2 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h2>
          <p className="text-gray-300 text-sm line-clamp-3 leading-tight">{description}</p>
        </div>
      </div>
    </Link>
  );
}
