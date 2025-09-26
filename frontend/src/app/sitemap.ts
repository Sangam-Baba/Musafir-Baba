import { MetadataRoute } from "next";

interface coverImage{
  url: string,
  public_id: string,
  width: number,
  height: number
  alt: string
}
interface blog{
  _id: string;
  title: string;
  coverImage: coverImage;
  content: string;
  metaDescription: string;
  slug: string;
  updatedAt: string
}
// Example: Fetch blog slugs from your DB or API
async function getBlogs() {
  const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/`);
  if(!res.ok) throw new Error("Failed to fetch blogs");
  const data=await res.json();
  return data.data;
}
// async function getNews() {
//   const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/news/`);
//   if(!res.ok) throw new Error("Failed to fetch news");
//   const data=await res.json();
//   return data.data;
// }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await getBlogs();
//   const news = await getNews();
  return [
    {
      url: "https://musafirbaba.com/",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://musafirbaba.com/blog",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://musafirbaba.com/news",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://musafirbaba.com/packages",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }, 
    {
      url: "https://musafirbaba.com/privacy-policy",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://musafirbaba.com/terms-and-conditions",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    }, 
    {
      url: "https://musafirbaba.com/refund-and-cancellation",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },           
    ...blogs.map((blog : blog) => ({
      url: `https://musafirbaba.com/blog/${blog.slug}`,
      lastModified: new Date(blog.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    })),
  ];
}
