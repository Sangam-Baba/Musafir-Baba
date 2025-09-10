import React from 'react'
import { Card } from '../ui/card'
import Image from 'next/image'

const data=[
    {
        title:"Weekend Getaways",
        description:"Experience thrilling adventures and unforgettable moments in the heart of Delhi.",
        img:"https://res.cloudinary.com/dmmsemrty/image/upload/v1757402014/j3jyqodvzgarftilb3dd.png"
    },
    {
        title:"Honeymoon Packages",
        description:"Discover the beauty of Delhi on your own and create unforgettable memories.",
        img:"https://res.cloudinary.com/dmmsemrty/image/upload/v1757399660/mscievdho61vs6fhhlzj.png"
    },
    {
        title:"Customized Tour Packages",
        description:"Your tip, your way. Create a customized tour package that perfectly fits your interests and preferences.",
        img:"https://res.cloudinary.com/dmmsemrty/image/upload/v1757400475/rmgdcyoxb9knlangdols.png"
    },
    {
        title:"Group Tour Packages",
        description:"Travel together with our Group Tour Packages- seamless planning, grate deals, and unforgetable group adventures.",
        img:"https://res.cloudinary.com/dmmsemrty/image/upload/v1757400865/j6sun08brrmcaovhbqh1.png"
    }, 
        {
        title:"Solo Tour Packages",
        description:"Explore freely with our Solo tripss- safe, well planned and perfect fro independent travellers.",
        img:"https://res.cloudinary.com/dmmsemrty/image/upload/v1757505917/service-1_2_xzguaq.svg"
    },
    {
        title:"Family Tour Packages",
        description:"Make memories with our Family Tour fun filled, safe and perfect for all ages",
        img:"https://res.cloudinary.com/dmmsemrty/image/upload/v1757505061/service-2_1_u6yuzr.png"
    },
    {
        title:"Corporate Tour Packages",
        description:"Seamless Corporate Tour Packages fro teamretreate, business trips, and stress free travel planning.",
        img:"https://res.cloudinary.com/dmmsemrty/image/upload/v1757505061/service-8_pgcnpk.png"
    },
    {
        title:"Backpacking Trips",
        description:"Adventure awaits! Our Backpacking Trips offer the perfect blend of adventure and relaxation.",
        img:"https://res.cloudinary.com/dmmsemrty/image/upload/v1757505061/service-9_ztf8ca.png"
    }, 
]
function ThirdSection() {
  return (
    <section className='w-full mx-auto px-4 md:px-8 lg:px-20 py-16'>
    <div className='max-w-7xl mx-auto'>
        <div className='flex flex-col gap-2 items-center'>
          <h2 className='text-xl md:text-2xl font-bold'>Find Your Perfect Getaway with the Best Travel Agency in Delhi</h2>
         <div className='w-20 h-1 bg-[#FE5300]'></div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 px-4'>
             <Card className='flex flex-col gap-4 bg-[#EBFFF2] items-center py-4 px-4'>
            <Image src={data[0].img} alt={data[0].title} width={50} height={50}/>
            <h1 className='text-xl font-semibold text-center'>{data[0].title}</h1>
            <p className='text-sm text-center'>{data[0].description}</p>
           </Card>
            <Card className='flex flex-col gap-4 bg-[#FFF5E4] items-center py-4 px-4'>
            <Image src={data[1].img} alt={data[1].title} width={50} height={50}/>
            <h1 className='text-xl font-semibold text-center'>{data[1].title}</h1>
            <p className='text-sm text-center'>{data[1].description}</p>
           </Card>
            <Card className='flex flex-col gap-4 bg-[#EBFFF2] items-center py-4 px-4'>
            <Image src={data[2].img} alt={data[2].title} width={50} height={50}/>
            <h1 className='text-xl font-semibold text-center'>{data[2].title}</h1>
            <p className='text-sm text-center'>{data[2].description}</p>
           </Card>
            <Card className='flex flex-col gap-4 bg-[#FFF5E4] items-center py-4 px-4'>
            <Image src={data[3].img} alt={data[3].title} width={50} height={50}/>
            <h1 className='text-xl font-semibold text-center'>{data[3].title}</h1>
            <p className='text-sm text-center'>{data[3].description}</p>
           </Card>
            <Card className='flex flex-col gap-4 bg-[#EBFFF2] items-center py-4 px-4'>
            <Image src={data[4].img} alt={data[4].title} width={50} height={50}/>
            <h1 className='text-xl font-semibold text-center'>{data[4].title}</h1>
            <p className='text-sm text-center'>{data[4].description}</p>
           </Card>
             <Card className='flex flex-col gap-4 bg-[#FFF6F6] items-center py-4 px-4'>
            <Image src={data[7].img} alt={data[7].title} width={50} height={50}/>
            <h1 className='text-xl font-semibold text-center'>{data[7].title}</h1>
            <p className='text-sm text-center'>{data[7].description}</p>
           </Card>
            <Card className='flex flex-col gap-4 bg-[#EBFFF2] items-center py-4 px-4'>
            <Image src={data[5].img} alt={data[5].title} width={50} height={50}/>
            <h1 className='text-xl font-semibold text-center'>{data[5].title}</h1>
            <p className='text-sm text-center'>{data[5].description}</p>
           </Card>
            <Card className='flex flex-col gap-4 bg-[#FFF6F6] items-center py-4 px-4'>
            <Image src={data[6].img} alt={data[6].title} width={50} height={50}/>
            <h1 className='text-xl font-semibold text-center'>{data[6].title}</h1>
            <p className='text-sm text-center'>{data[6].description}</p>
           </Card>
      </div>
      </div>


    </section>
  )
}

export default ThirdSection