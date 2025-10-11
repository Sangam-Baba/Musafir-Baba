"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface Item {
  text: string;
  url: string;
}
const getFooter = async (title: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/footer/?title=${title}`
  );
  if (!res.ok) throw new Error("Failed to fetch footer");
  const data = await res.json();
  return data.data[0];
};
interface FooterItemProps {
  title: string;
}
function FooterItem({ title }: FooterItemProps) {
  const { data: FootObj } = useQuery({
    queryKey: ["footer", title],
    queryFn: () => getFooter(title),
  });
  console.log("this is footer with ", title, "and data is ", FootObj);
  return (
    <section>
      <p className={`text-lg font-bold`}>{title}</p>
      <p className="h-0.5 w-[5%] bg-[#FE5300]"></p>
      <ul className={` space-y-2 pt-4 `}>
        {FootObj?.content?.map((item: Item, idx: number) => (
          <li className="hover:text-[#FE5300]" key={idx}>
            <Link href={item.url}>{item.text}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default FooterItem;
