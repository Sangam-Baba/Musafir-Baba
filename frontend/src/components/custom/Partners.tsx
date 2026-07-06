import Image from "next/image";

export default function Partners() {
  const partners = [
    {
      name: "VFS Global",
      image: "https://cdn.musafirbaba.com/images/vfs_ec9739.jpg",
    },
    {
      name: "Paytm",
      image: "https://cdn.musafirbaba.com/images/download_2_kx6up9.png",
    },
    {
      name: "MakeMyTrip",
      image: "https://cdn.musafirbaba.com/images/mmt_bzhgxl.png",
    },
    {
      name: "EaseMyTrip",
      image: "https://cdn.musafirbaba.com/images/easemytrip-logo-png_seeklogo-517976_iy4r6z.png",
    },
    {
      name: "IndiGo",
      image: "https://cdn.musafirbaba.com/images/2_zou3l6.png",
    },
    {
      name: "Goibibo",
      image: "https://cdn.musafirbaba.com/images/1_pmcv8t.png",
    },
    {
      name: "PayU",
      image: "https://cdn.musafirbaba.com/images/pay_u_ypbpf9.png",
    },
    {
      name: "RedBus",
      image: "https://cdn.musafirbaba.com/images/red_bgv024.png",
    },
    {
      name: "Air India",
      image: "https://cdn.musafirbaba.com/images/1767961958311-ai-large-default_dmageq.webp",
    },
    {
      name: "SpiceJet",
      image: "https://cdn.musafirbaba.com/images/spicejett_wvlra2.png",
    },
    {
      name: "Akasa Air",
      image: "https://cdn.musafirbaba.com/images/1767961958252-akasha_tjdowv.webp",
    },
    {
      name: "Vistara",
      image: "https://cdn.musafirbaba.com/images/vis_1_wkfaqo.png",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-8 border-t border-gray-100 border-b">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-16 w-full">
        <h2 className="text-[#FE5300] text-[11px] md:text-[13px] font-bold tracking-[0.1em] uppercase shrink-0 whitespace-nowrap">
          OUR TRUSTED PARTNERS
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-5 md:gap-x-10 md:gap-y-6 items-center">
          {partners.map((partner, i) => (
            <div key={i} className="flex items-center justify-center cursor-default">
              <div className="relative w-16 h-8 md:w-24 md:h-10">
                <Image
                  src={partner.image}
                  alt={partner.name}
                  fill
                  sizes="(max-width: 768px) 64px, 96px"
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
