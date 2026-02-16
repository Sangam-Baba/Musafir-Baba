import React from "react";

async function page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <div>page {slug}</div>;
}

export default page;
