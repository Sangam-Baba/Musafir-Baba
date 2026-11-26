import type { SpecialRentalAuthor as Author } from "@/lib/rentalSpecial";

// Same "Author Information" block and same fallback team text as the vehicle
// rental detail page.
const FALLBACK: Author = {
  name: "MusafirBaba Vehicle Rental Team",
  role: "expert",
  avatar: { url: "" },
  about:
    "Our vehicle rental specialists regularly assist travelers with choosing the best vehicles, travel planning, and rental consultation for a wide range of destinations.",
};

export default function SpecialRentalAuthor({
  author,
  updatedAt,
}: {
  author?: Author | null;
  updatedAt?: string;
}) {
  const a = author || FALLBACK;
  return (
    <div id="author" className="scroll-mt-40 mb-8">
      <div className="bg-orange-50/40 rounded-2xl p-6 md:p-8 border border-orange-100 flex flex-col gap-4 shadow-sm">
        <h4 className="text-lg md:text-xl font-bold font-heading text-gray-900">Author Information</h4>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
          {a.avatar?.url ? (
            <img src={a.avatar.url} alt={a.name} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shadow-sm border-2 border-white" />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-2xl shadow-sm border-2 border-white">
              {a.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-2 text-gray-600 text-sm md:text-base flex-1">
            <p className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">Written By:</span> {a.name}{" "}
              {a.role && <span className="text-gray-500 text-xs bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">{a.role}</span>}
            </p>
            {a.about && <p className="text-sm text-gray-600 leading-relaxed bg-white/50 p-3 rounded-lg border border-orange-50">{a.about}</p>}
            <p>
              <span className="font-semibold text-gray-800">Last Updated:</span>{" "}
              {updatedAt
                ? new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Regularly Updated Before Every Season"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
