import Image from "next/image";
import Link from "next/link";

interface AuthoreInterface {
  name: string;
  about: string;
  avatar: {
    url: string;
  };
  slug: string;
}

const getAllAuthor = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/authors`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
};
// export async function generateMetadata() {
//   return {
//     titription: `${authorData.about} | Musafir Baba`,
//     altele: `${authorData.name} | Musafir Baba`,
//     descrnates: {
//       canonical: `https://musafirbaba.com/author/${author}`,
//     },
//     openGraph: {
//       title: `${authorData.name} | Musafir Baba`,
//       description: `${authorData.about} | Musafir Baba`,
//       url: `https://musafirbaba.com/author/${author}`,
//       type: "website",
//       images: authorData.coverImage?.url || "https://musafirbaba.com/logo.svg",
//     },
//   };
// }

export default async function BookingIndexPage() {
  const allAuthor = await getAllAuthor();
  console.log("All AUthore", allAuthor);
  return (
    <div className="mt-10 mx-auto max-w-7xl px-5">
      <div>
        <h1 className="font-semibold text-xl md:text-2xl">
          MusafirBaba Authors
        </h1>
      </div>
      {allAuthor?.length > 0 ? (
        allAuthor.map((author: AuthoreInterface, i: number) => {
          return (
            <div
              key={i}
              className="mt-10 mx-auto max-w-7xl px-8 py-8 md:px-12 md:py-12 border border-gray-200 shadow-md rounded-2xl bg-white flex flex-col md:flex-row items-center md:items-start gap-8"
            >
              {/* Author Image */}
              <div className="flex-shrink-0">
                <Image
                  src={author.avatar?.url || "/avatar.png"}
                  alt="MusafirBaba author image"
                  width={200}
                  height={200}
                  className="rounded-xl object-cover "
                />
              </div>

              {/* Author Info */}
              <div className="text-center md:text-left space-y-3">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {author.name}
                </h2>
                <p className="text-gray-600 leading-relaxed">{author.about}</p>
                <Link
                  href={`/author/${author.slug}`}
                  className="hover:text-blue-600"
                >
                  Read Articles
                </Link>
              </div>
            </div>
          );
        })
      ) : (
        <div>
          <p>Sorry No Author Found</p>
        </div>
      )}
    </div>
  );
}
