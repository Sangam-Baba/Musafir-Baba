import Link from "next/link";
import React from "react";

interface ItemsInterface {
  title: string;
  url: string;
}
function HelpfulResources({ data }: { data: ItemsInterface[] }) {
  return (
    <div className="border border-gray-400 px-4 py-8 flex flex-col gap-6 w-full rounded-md bg-gray-50">
      <h3 className="text-lg md:text-xl font-semibold text-center">
        What To Read Next
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-[80%] mx-auto">
        <ul className="list-disc list-outside pl-5 space-y-2">
          {data
            .slice(0, Math.ceil(data.length / 2))
            .map((item: ItemsInterface, i) => (
              <li key={i} className="text-sm md:text-base ">
                <Link
                  href={item.url}
                  className="text-blue-500 hover:underline hover:underline transition"
                >
                  {item.title}
                </Link>
              </li>
            ))}
        </ul>

        {data.length > 2 && (
          <ul className="list-disc list-outside pl-5 space-y-2">
            {data
              .slice(Math.ceil(data.length / 2))
              .map((item: ItemsInterface, i) => (
                <li
                  key={i}
                  className="text-sm md:text-base text-blue-500 hover:underline"
                >
                  <Link
                    href={item.url}
                    className="text-blue-500 hover:underline hover:underline transition"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default HelpfulResources;
