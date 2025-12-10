import React from "react";

interface Item {
  text: string;
  url: string;
}
const getFooter = async (title: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/footer/?title=${title}`,
    {
      next: { revalidate: 120 },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch footer");
  const data = await res.json();
  return data.data[0];
};
interface FooterItemProps {
  title: string;
}
async function FooterItem({ title }: FooterItemProps) {
  const FootObj = await getFooter(title);

  return (
    <section>
      <p className={`text-lg font-bold`}>{title}</p>
      <p className="h-0.5 w-[8%] bg-[#FE5300]"></p>
      <ul className={` space-y-2 pt-4 `}>
        {FootObj?.content?.map((item: Item, idx: number) => (
          <li className="hover:text-[#FE5300]" key={idx}>
            <a href={item.url}>{item.text}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default FooterItem;
