import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import Image from "next/image";
function Partners() {
  const partners = [
    {
      name: "VFS",
      image: "https://cdn.musafirbaba.com/images/vfs_ec9739.jpg",
    },
    {
      name: "Paytem",
      image: "https://cdn.musafirbaba.com/images/download_2_kx6up9.png",
    },
    {
      name: "MMT",
      image: "https://cdn.musafirbaba.com/images/mmt_bzhgxl.png",
    },
    {
      name: "EMT",
      image:
        "https://cdn.musafirbaba.com/images/easemytrip-logo-png_seeklogo-517976_iy4r6z.png",
    },
    {
      name: "Goibibo",
      image: "https://cdn.musafirbaba.com/images/1_pmcv8t.png",
    },
    {
      name: "indigo",
      image: "https://cdn.musafirbaba.com/images/2_zou3l6.png",
    },
    {
      name: "Pay U",
      image: "https://cdn.musafirbaba.com/images/pay_u_ypbpf9.png",
    },
    {
      name: "Red Bus",
      image: "https://cdn.musafirbaba.com/images/red_bgv024.png",
    },
    {
      name: "Air India",
      image:
        "https://cdn.musafirbaba.com/images/1767961958311-ai-large-default_dmageq.webp",
    },
    {
      name: "Spicejet",
      image: "https://cdn.musafirbaba.com/images/spicejett_wvlra2.png",
    },
    {
      name: "akasha airlines",
      image:
        "https://cdn.musafirbaba.com/images/1767961958252-akasha_tjdowv.webp",
    },
    {
      name: "vistara",
      image: "https://cdn.musafirbaba.com/images/vis_1_wkfaqo.png",
    },
  ];
  return (
    <section className="w-full mx-auto px-4 md:px-8 lg:px-20 md:py-16 py-8">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="flex flex-col gap-2 items-center">
          <h2 className="text-lg md:text-3xl font-bold text-center">
            Our Trusted Partners
          </h2>
          <p className="w-20 h-1 bg-[#FE5300] text-center"></p>
          <p className=" text-center">
            We are proud to have worked with some of the best companies in the
            industry
          </p>
        </div>
        <div className="hidden md:grid md:grid-cols-6 gap-6 mt-8 px-4">
          {partners.map((partner, i) => (
            <div
              key={i}
              className="w-full flex items-center overflow-hidden rounded-lg "
            >
              <Image
                src={partner.image}
                alt={partner.name || "Partner logo"}
                width={250}
                height={150}
                className="object-contain p-4 mx-auto"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Carosal */}

        <div className=" md:hidden flex flex-col gap-2 items-center mt-8 px-4 w-full">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-sm"
          >
            <CarouselContent>
              {partners.map((data, i) => (
                <CarouselItem key={i} className="basis-1/2">
                  <div className="w-full flex items-center overflow-hidden rounded-lg ">
                    <Image
                      src={data.image}
                      alt={data.name || "Partner logo"}
                      width={250}
                      height={150}
                      className="object-contain p-4 mx-auto"
                      loading="lazy"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="ml-6" />
            <CarouselNext className="mr-6" />
            {/* <CarouselDots /> */}
          </Carousel>
        </div>
      </div>
    </section>
  );
}

export default Partners;
