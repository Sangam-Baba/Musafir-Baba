import React from "react";
import Image from "next/image";
import QueryForm from "./QueryForm";

function SectionFive() {
  return (
    <section className=" w-full  px-4 md:px-8 lg:px-20 md:py-16 py-8">
      <div className="md:max-w-7xl mx-auto flex md:flex-row flex-col gap-12 items-stretch">
        <div className="md:w-1/2  hidden md:flex ">
          <Image
            className="object-cover w-full h-full  rounded-xl "
            src="https://cdn.musafirbaba.com/images/vector_with_white_bg_cqwssa.jpg"
            width={500}
            height={510}
            alt="h1"
          />
        </div>
        <div className="md:w-1/2 flex">
          <div className="w-full flex flex-col justify-center">
            <QueryForm />
          </div>
        </div>
      </div>
    </section>
  );
}

export default SectionFive;
