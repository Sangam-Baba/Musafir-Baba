import React from "react";
import Image from "next/image";
import imgleft from "../../../public/Frame 518.png";
import imgright from "../../../public/Frame 519.png";
import { Send } from "lucide-react";
function Newslatter() {
  return (
    <section className="flex  md:flex-row justify-between  w-full bg-[#FF5300]">
      <Image src={imgright} alt="logo" className="w-1/7" />
      <div className="w-5/7 flex flex-col gap-2 items-center py-10 md:gap-6 gap-2">
        <h4 className="text-2xl font-bold text-white">{`Get Ready to Explore the Beauty of India`}</h4>
        <p className="text-white">
          Join our travel community — discover hidden gems, latest deals, and
          trip ideas straight to your inbox.
        </p>
        <div className="flex gap-2 border border-white rounded-lg items-center w-[300px] overflow-hidden ">
          <div className="ml-2">
            <Send color="white" />
          </div>

          <input
            type="email"
            placeholder="Your email address"
            className="bg-transparent outline-none p-2 text-white w-[80%] "
          />
          <button className="bg-white p-2 font-semibold   text-[#FF5300] rounded-tr-lg rounded-br-lg">
            Subscribe
          </button>
        </div>
      </div>
      <div className="1/7">
        <Image src={imgleft} alt="logo" />
      </div>
    </section>
  );
}

export default Newslatter;
