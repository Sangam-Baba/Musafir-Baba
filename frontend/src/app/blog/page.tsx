import BlogCard from "@/components/custom/BlogCard";
import Hero from "@/components/custom/Hero";

interface blog{
  _id: string;
  title: string;
  coverImage: string;
  content: string;
  slug: string;
}
interface blogs{
  blogs: blog[]
}
async function getBlogs() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blog/`, {
    next: { revalidate: 60 }, // ISR: revalidate every 1 minute
  });

  if (!res.ok) throw new Error("Failed to fetch blogs");
  const data=await res.json();
  console.log(data);
  return data.data;
}

export default async function BlogPage() {
  const blogs = await getBlogs();

  return (
    <section className="w-full ">
      <Hero
       image="/Heroimg.jpg" 
       title="Blog" 
       />
    <div className="container max-w-7xl mx-auto py-10 px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {blogs.map((blog: blog) => (
        <BlogCard
          key={blog._id}
          title={blog.title}
          coverImage={blog.coverImage}
          description={blog.content}
          slug={blog.slug}
        />
      ))}
    </div>
    </section>
  );
}
