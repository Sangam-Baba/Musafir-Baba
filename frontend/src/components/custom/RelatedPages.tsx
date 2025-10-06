import React from "react";
// import { useQuery } from "@tanstack/react-query";
import ListBlogSidebar from "./ListBlogSidebar";
// import { Loader } from "./loader";
const getrelatedpages = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/related/${slug}`
  );
  if (!res.ok) throw new Error("Failed to fetch related pages");
  const data = await res.json();
  return data;
};
async function RelatedPages({
  slug,
  parent,
}: {
  slug: string;
  parent: string;
}) {
  const res = await getrelatedpages(slug);
  // const { data, isLoading, isError } = useQuery({
  //   queryKey: ["relatedpages", slug],
  //   queryFn: () => getrelatedpages(slug),
  // });
  // if (isLoading) return <Loader size="lg" message="Loading related pages..." />;
  // if (isError) return <h1>Failed to fetch related pages</h1>;
  const pageArray = res?.data ?? [];
  if (pageArray.length === 0) return null;
  return (
    <ListBlogSidebar
      blogs={pageArray}
      title="Related Pages"
      type="latest"
      url={parent}
    />
  );
}

export default RelatedPages;
