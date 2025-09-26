"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface Item {
    _id: string;
  text: string;
  url: string;
}

interface Footer {
  _id: string;
  title: string;
  content: Item[];
}

const getFooter = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/footer`);
  if (!res.ok) throw new Error("Failed to fetch footer");
  const data = await res.json();
  return data.data as Footer[];
};

function LowerFooterItem() {
  const { data: footerArray } = useQuery({
    queryKey: ["footer"],
    queryFn: getFooter,
  });

  const lowerFooter = footerArray?.filter((item) =>
    !["Services", "About Us", "Domestic Trips", "International Trips"].includes(  item.title   ));

  return (
    <section className="w-full flex flex-col gap-6">
      {lowerFooter?.map((item) => (
        <div key={item._id} className="flex gap-2">
          
          <h2 className="font-semibold mb-3">
            {item.title}:
          </h2>

          
          <ul className="flex flex-wrap gap-2 text-sm md:text-base">
            {item.content?.map((link) => (
              <li
                key={link._id}
                className="hover:text-[#FE5300] transition-colors duration-200"
              >
                <Link href={link.url}>{link.text} |</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default LowerFooterItem;
