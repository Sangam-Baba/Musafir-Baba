import React from "react";
import Link from "next/link";

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
      <p className={`hidden md:block text-lg font-bold`}>{title}</p>
      <p className="hidden md:block h-0.5 w-[8%] bg-[#FE5300]"></p>
      <ul className={` space-y-2 pt-4 `}>
        {FootObj?.content?.map((item: Item, idx: number) => (
          <li className="hover:text-[#FE5300]" key={idx}>
            <a href={item.url}>{item.text}</a>
          </li>
        ))}
        {title === "Services" && (
          <>
            <li key="mbconnect" className="pt-1">
              <Link
                href="/mbconnect"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50/90 hover:bg-orange-100 border border-orange-200/80 text-[#FE5300] font-semibold text-xs transition-all shadow-xs group"
              >
                <span>MBConnect</span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#FE5300] text-white shadow-xs">
                  NEW
                </span>
              </Link>
            </li>
            <li key="mbgo">
              <Link
                href="/mbgo"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50/90 hover:bg-orange-100 border border-orange-200/80 text-[#FE5300] font-semibold text-xs transition-all shadow-xs group"
              >
                <span>MBGo</span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#FE5300] text-white shadow-xs">
                  NEW
                </span>
              </Link>
            </li>
            <li className="text-[#FE5300] font-semibold hover:text-[#e04a00] pt-1" key="partner-portal">
              <Link href="/partner/login">Partner Portal</Link>
            </li>
          </>
        )}
      </ul>
    </section>
  );
}

export default FooterItem;
