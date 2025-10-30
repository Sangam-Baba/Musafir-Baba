import BlogCard from "@/components/custom/BlogCard";
import Breadcrumb from "@/components/common/Breadcrumb";
import Image from "next/image";

interface coverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
interface blog {
  _id: string;
  title: string;
  coverImage: coverImage;
  content: string;
  metaDescription: string;
  slug: string;
}
async function getBlogs(category?: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/blogs?author=${category}`,
    {
      next: { revalidate: 60 }, // ISR: revalidate every 1 minute
    }
  );

  if (!res.ok) throw new Error("Failed to fetch blogs");
  const data = await res.json();
  // console.log(data);
  return data.data;
}
async function getAuthor(author: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/authors/${author}`
  );
  const data = await res.json();
  return data?.data;
}

async function getNews(author: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/news?author=${author}`
  );
  const data = await res.json();
  return data?.data;
}
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const author = params.slug;
  const authorData = await getAuthor(author);
  return {
    title: `${authorData.name} | Musafir Baba`,
    description: `${authorData.about} | Musafir Baba`,
    alternates: {
      canonical: `https://musafirbaba.com/author/${author}`,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: { slug: string };
}) {
  const author = params.slug;

  const blogs = await getBlogs(author);
  const news = await getNews(author);
  const authorData = await getAuthor(author);

  return (
    <section className="w-full ">
      {/* avatar */}
      <div className="mt-10 mx-auto max-w-7xl px-8 py-8 md:px-12 md:py-12 border border-gray-200 shadow-md rounded-2xl bg-white flex flex-col md:flex-row items-center md:items-start gap-8">
        {/* Author Image */}
        <div className="flex-shrink-0">
          <Image
            src="/avatar.png"
            alt="MusafirBaba author image"
            width={200}
            height={200}
            className="rounded-xl object-cover shadow-sm"
          />
        </div>

        {/* Author Info */}
        <div className="text-center md:text-left space-y-3">
          <h2 className="text-2xl font-semibold text-gray-800">
            {authorData.name}
          </h2>
          <p className="text-gray-600 leading-relaxed">{authorData.about}</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      {/* Related Blogs */}
      {blogs.length > 0 && (
        <h2 className="text-2xl max-w-7xl mx-auto font-semibold mb-4 mt-8 px-4">
          Related Blogs
        </h2>
      )}
      <div className="container max-w-7xl mx-auto py-10 px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.map((blog: blog) => (
          <BlogCard
            key={blog._id}
            type="blog"
            title={blog.title}
            coverImage={blog.coverImage.url}
            description={blog.metaDescription}
            slug={blog.slug}
          />
        ))}
      </div>
      {/* Related News */}
      {blogs.length > 0 && (
        <h2 className="text-2xl max-w-7xl mx-auto font-semibold mb-4 mt-8 px-4">
          Related News
        </h2>
      )}
      <div className="container max-w-7xl mx-auto py-10 px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((blog: blog) => (
          <BlogCard
            key={blog._id}
            type="blog"
            title={blog.title}
            coverImage={blog.coverImage.url}
            description={blog.metaDescription}
            slug={blog.slug}
          />
        ))}
      </div>
    </section>
  );
}
