import React from 'react'
import Image from 'next/image'
import imgleft from "../../../public/Frame 518.png";
import imgright from "../../../public/Frame 519.png";
function Newslatter() {
  return (
    <section className='flex  md:flex-row justify-between  w-full bg-[#FF5300]'>
       <Image src={imgright} alt='logo' className='w-1/7' />   
        <div className='w-6/7 flex flex-col gap-2 items-center py-10 '>
         <h1 className='text-2xl font-bold text-white'>{`Prepare Yourself & Let's Explore the Beauty of the India`}</h1>
         <p className='text-white'>We have Many offers especially for you</p>
         <div className='flex gap-2 border border-white rounded-lg '>
            <input type="email" placeholder='Your email address' className='bg-transparent outline-none p-2 text-white'/>
            <button className='bg-white p-2 font-semibold   text-[#FF5300] rounded-tr-lg rounded-br-lg'>Subscribe</button>
         </div>
        </div>
        <div className=''>
          <Image src={imgleft} alt='logo'  />
        </div>     
    </section>
  )
}

export default Newslatter