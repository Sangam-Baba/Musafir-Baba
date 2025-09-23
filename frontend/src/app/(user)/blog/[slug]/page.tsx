import Image from "next/image";
import { BlogContent } from "@/components/custom/BlogContent";
import Link from "next/link";
import NotFoundPage from "@/components/common/Not-Found";
import QueryForm from "@/components/custom/QueryForm";
import CategorySidebar from "@/components/custom/CategorySidebar";
import LatestBlogSidebar from "@/components/custom/LatestBlogSidebar";
import BlogViewTracker from "@/components/custom/BlogViewTracker";
import TrandingBlogSidebar from "@/components/custom/TrandingBlogSidebar";
import BlogLikes from "@/components/custom/BlogLikes";
import {BlogComments} from "@/components/custom/BuildCommentTree";
// Fetch blog by slug
async function getBlog(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`, {
    next: { revalidate: 60 }, // ISR: revalidate every 1 min
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
}

// SEO Metadata
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { blog } = await getBlog(params.slug);

  if (!blog) {
    return {
      title: "Blog Not Found | Musafir Baba",
      description: "The requested blog could not be found.",
    };
  }

  return {
    title: blog.metaTitle || blog.title,
    description: blog.metaDescription || blog.content?.slice(0, 160),
    keywords: blog.keywords?.length ? blog.keywords.join(", ") : blog.tags.join(", "),
    openGraph: {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription,
      images: [blog.coverImage.url],
    },
  };
}

// Blog Detail Page
export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const {blog , comments }= await getBlog(params.slug);
  console.log("My blog is : ",blog);
  console.log("My comments is : ",comments);
  if (!blog) return <NotFoundPage />;

  return (
    <div className="flex flex-col lg:flex-row gap-8 mx-auto max-w-7xl py-10 px-12">
     <article className="lg:w-5/7  ">
      {/* Cover Image */}
      <BlogViewTracker id={blog._id} />
      <div className="relative w-full h-80 md:h-96 rounded-2xl overflow-hidden shadow-lg">
        <Image
          src={blog.coverImage.url}
          alt={blog.title}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Title & Meta */}
      <header className="mt-6 space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">{blog.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
         <span>👤 Author:  <Link href={`/author/${blog.author?.slug}`}>{blog.author?.name}</Link></span>
          <span>Category: {blog.category.name}</span>
          <span>📅 {new Date(blog.createdAt).toLocaleDateString()}</span>
          <span>👀 {blog.views +1000} views</span>
          <span><BlogLikes id={blog._id} initialLikes={blog.likes} /></span>
        </div>
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-2">
          {blog.tags.map((tag: string) => (
            <span
              key={tag}
              className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* Blog Content */}
      <section className="prose prose-lg max-w-none mt-6">
        <BlogContent html={blog.content} />
      </section>

      {/* Comments Section */}
      <section className="mt-10">
          <BlogComments blogId={blog._id} initialComments={comments} />
      </section>
     </article>
     <div className="lg:w-2/7">
      <QueryForm />
      <CategorySidebar />
      <LatestBlogSidebar />
      <TrandingBlogSidebar />
      
     </div>
    </div>
  );
}
