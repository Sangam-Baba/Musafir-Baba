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
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1765970989/vfs_ec9739.jpg",
    },
    {
      name: "Paytem",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766466823/download_2_kx6up9.png",
    },
    {
      name: "MMT",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1765970989/mmt_bzhgxl.png",
    },
    {
      name: "EMT",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1765969134/easemytrip-logo-png_seeklogo-517976_iy4r6z.png",
    },
    {
      name: "Goibibo",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766408666/1_pmcv8t.png",
    },
    {
      name: "indigo",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766408666/2_zou3l6.png",
    },
    {
      name: "Pay U",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766574772/pay_u_ypbpf9.png",
    },
    {
      name: "Red Bus",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766574588/red_bgv024.png",
    },
    {
      name: "Air India",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766467352/ai-large-default_dmageq.svg",
    },
    {
      name: "Spicejet",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766467542/spicejett_wvlra2.png",
    },
    {
      name: "akasha airlines",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766467352/akasha_tjdowv.svg",
    },
    {
      name: "vistara",
      image:
        "https://res.cloudinary.com/dmmsemrty/image/upload/v1766574803/vis_1_wkfaqo.png",
    },
  ];
  return (
    <section className="w-full mx-auto px-4 md:px-8 lg:px-20 md:py-16 py-8">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="flex flex-col gap-2 items-center">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
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
