import React from "react";
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
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/footer`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Failed to fetch footer");
  const data = await res.json();
  return data.data as Footer[];
};

async function LowerFooterItem() {
  const footerArray = await getFooter();

  const lowerFooter = footerArray?.filter(
    (item) => !["Services", "About Us"].includes(item.title)
  );

  return (
    <section className="w-full flex flex-col ">
      {lowerFooter?.map((item) => (
        <div key={item._id} className="flex gap-1">
          <h2 className="font-semibold mb-3 inline-block whitespace-nowrap pr-2">
            {item.title}:
          </h2>

          <ul className="flex flex-wrap gap-1 text-sm md:text-base">
            {item.content?.map((link) => (
              <li
                key={link._id}
                className="hover:text-[#FE5300] transition-colors duration-200 ease-in-out"
              >
                <Link
                  className="text-justify text-xs md:text-sm"
                  href={link.url}
                >
                  {link.text} |
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default LowerFooterItem;
