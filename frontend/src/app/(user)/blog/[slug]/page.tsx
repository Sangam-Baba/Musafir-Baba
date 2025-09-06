import Image from "next/image";
import { notFound } from "next/navigation";

// Fetch blog by slug
async function getBlog(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blog/${slug}`, {
    next: { revalidate: 60 }, // ISR: revalidate every 1 min
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
}

// ✅ SEO Metadata
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const blog = await getBlog(params.slug);

  if (!blog) {
    return {
      title: "Blog Not Found | YourApp",
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
      images: [blog.coverImage],
    },
  };
}

// ✅ Blog Detail Page
export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const blog = await getBlog(params.slug);

  if (!blog) return notFound();

  return (
    <article className="container mx-auto max-w-4xl py-10 px-8">
      {/* Cover Image */}
      <div className="relative w-full h-80 md:h-96 rounded-2xl overflow-hidden shadow-lg">
        <Image
          src={blog.coverImage}
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
          <span>👤 Author: {blog.author.name}</span>
          <span>Category: {blog.category.name}</span>
          <span>📅 {new Date(blog.createdAt).toLocaleDateString()}</span>
          <span>👀 {blog.views} views</span>
          <span>❤️ {blog.likes.length} likes</span>
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
        <p>{blog.content}</p>
      </section>

      {/* Comments Section */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Comments ({blog.comments.length})</h2>
        {blog.comments.length === 0 ? (
          <p className="text-gray-500">No comments yet. Be the first to comment!</p>
        ) : (
          <p>Comments will go here</p>
          // <ul className="space-y-4">
          //   {blog.comments.map((comment: string, idx: number) => (
          //     <li key={idx} className="p-3 border rounded-lg">
          //       <p className="text-sm text-gray-800">{comment.text}</p>
          //       <span className="text-xs text-gray-500">
          //         by {comment.user} on{" "}
          //         {new Date(comment.createdAt).toLocaleDateString()}
          //       </span>
          //     </li>
          //   ))}
          // </ul>
        )}
      </section>
    </article>
  );
}
