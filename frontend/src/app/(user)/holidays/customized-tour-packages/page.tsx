import React from "react";
import Hero from "@/components/custom/Hero";
// import { useQuery } from "@tanstack/react-query";
// import { toast } from "sonner";
// import { Loader } from "@/components/custom/loader";
import Breadcrumb from "@/components/common/Breadcrumb";
// import { useAuthStore } from "@/store/useAuthStore";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin } from "lucide-react";
// import { useAuthDialogStore } from "@/store/useAuthDialogStore";
// import { useRouter } from "next/navigation";
import Link from "next/link";
interface Plan {
  title: string;
  include: string;
  price: number;
}

interface CoverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
interface Package {
  _id: string;
  title: string;
  slug: string;
  coverImage: CoverImage;
  plans: Plan[];
  duration: {
    days: number;
    nights: number;
  };
  destination: Destination;
  status: "draft" | "published";
}
interface Destination {
  _id: string;
  country: string;
  state: string;
  name: string;
  slug: string;
}

const getAllCustomizedPackages = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/`,
    {
      cache: "no-cache",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Packages");
  }
  const data = await res.json();
  return data?.data;
};

async function CustomizedPackagePage() {
  //   const router = useRouter();
  //   const accessToken = useAuthStore((state) => state.accessToken);
  //   const openDialog = useAuthDialogStore((state) => state.openDialog);
  //   const {
  //     data: AllPackages,
  //     isLoading,
  //     isError,
  //     error,
  //   } = useQuery({
  //     queryKey: ["category"],
  //     queryFn: getAllCustomizedPackages,
  //     retry: 2,
  //   });

  const AllPackages = await getAllCustomizedPackages();
  //   if (isLoading) {
  //     return <Loader size="lg" message="Loading ..." />;
  //   }
  //   if (isError) {
  //     toast.error(error.message);
  //     return <h1>{error.message}</h1>;
  //   }

  //   const handlePackageClick = (slug: string, state: string) => {
  //     if (!accessToken) {
  //       toast.info("Please login to view package details.");
  //       openDialog(
  //         "login",
  //         undefined,
  //         `holidays/customized-tour-package/${state}/${slug}`
  //       );
  //     } else {
  //       // 👇 If logged in, go to package detail page
  //       router.push(`/holidays/customized-tour-package/${state}/${slug}`);
  //     }
  //   };

  return (
    <section className="w-full mb-12">
      <Hero
        image={AllPackages[0]?.coverImage?.url || "/Hero1.jpg"}
        title=""
        align="center"
        height="lg"
        overlayOpacity={5}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>

      {/* Show category details */}
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center my-12">
        <h1 className="text-3xl font-bold">Customized Packages</h1>
        <div className="w-20 h-1 bg-[#FE5300] mt-2"></div>
        <p className="mt-2 text-muted-foreground">
          This is customized tour packages
        </p>
      </div>

      {/* Show packages under this category */}
      {AllPackages && AllPackages.length > 0 && (
        <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10">
          {AllPackages.map((pkg: Package) => (
            <Link
              //   onClick={() =>
              //     handlePackageClick(pkg.slug, pkg?.destination?.state)
              //   }
              key={pkg._id}
              href={`/holidays/customized-tour-packages/${pkg?.destination?.state}/${pkg.slug}`}
              className="cursor-pointer"
            >
              <Card className="overflow-hidden pt-0 pb-0 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer">
                {/* Image + Price tag */}
                <div className="relative h-56 w-full">
                  <Image
                    src={pkg.coverImage.url}
                    alt={pkg.coverImage.alt}
                    width={500}
                    height={500}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-[#FE5300] text-white px-3 py-1 rounded-full font-semibold text-sm shadow">
                    ₹{pkg.plans[0].price.toLocaleString("en-IN")}/- onwards
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {pkg.title}
                  </h3>

                  {/* Duration & Location */}
                  <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>
                        {pkg.duration?.nights}N/{pkg.duration?.days}D,
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span>{pkg.destination?.name}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 line-clamp-1">
                    Any Date of your choice
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default CustomizedPackagePage;
