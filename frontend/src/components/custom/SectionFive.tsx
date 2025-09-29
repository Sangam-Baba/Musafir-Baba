import React from 'react'
import Image from 'next/image';
import van from '../../../public/van.webp';
import QueryForm from './QueryForm';

function SectionFive() {
  return (
    <section className=" w-full  px-4 md:px-8 lg:px-20 py-16">
     <div className='md:max-w-7xl mx-auto flex md:flex-row flex-col gap-12 items-stretch'>
        <div className='md:w-1/2  flex'>
            <Image className='object-cover w-full h-full lg:h-[410px] rounded-xl' src="https://res.cloudinary.com/dmmsemrty/image/upload/v1759132915/vector_for_web_w6dn46.jpg" width={500} height={510} alt="h1" />
        </div>
        <div className="md:w-1/2 flex">
          <div className="w-full flex flex-col justify-center">
            <QueryForm />
          </div>
        </div>
        
     </div>
    </section>
  )
}

export default SectionFive