import React from 'react'
import Image from 'next/image';
import logo from "../../../public/logo.svg"
import Link from 'next/link';
import Map from '../custom/Map';
import { MapPin } from 'lucide-react';
import Newslatter from './Newslatter';
function Footer() {
  return (
    <div className=''>
        <Newslatter />
        <div className='flex flex-col md:flex-row gap-6 mb-8 py-15 px-4 md:px-10 lg:px-25  items-center md:items-start justify-between '>
            <div className="md:w-1/4  flex flex-col gap-2 ">
                <h1 className='text-lg font-semibold'>Quick Links</h1>
                <ul>
                    <li className='hover:text-[#FE5300]'><Link href="/">Home</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/packages">Packages</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/blog">Blogs</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/contact">Contact</Link></li>
                </ul>
               
            </div>
            <div className="md:w-1/4 flex flex-col gap-2">
                <h1 className='text-lg font-semibold'>Quick Links</h1>
                <ul>
                    <li className='hover:text-[#FE5300]'><Link href="/">Home</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/packages">Packages</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/blog">Blogs</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/contact">Contact</Link></li>
                </ul>
            </div>
            <div className="md:w-1/4 flex flex-col gap-2">
                <h1 className='text-lg font-semibold'>Importent</h1>
                <ul>
                    <li className='hover:text-[#FE5300]'><Link href="/">Home</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/packages">Packages</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/blog">Blogs</Link></li>
                    <li className='hover:text-[#FE5300]'><Link href="/contact">Contact</Link></li>
                </ul>          
            </div>
            <div className='md:w-1/4 gap-2'>
                <Image src={logo} alt="logo" />
                <div className='flex flex-col gap-2'>
                    <p className='flex justify-start '><MapPin size={40} color="#FE5300" className='mr-2 ' />1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043</p>
                    <Map address="1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043" />
                </div>
                
            </div>
            
        </div>
        <div className='text-center py-4 border-t border-gray-200 px-4'>
            <p>Copyright © 2020 - 2025 | Musafirbaba Travels Pvt. Ltd. | All Rights Reserved.</p>
        </div>
    </div>
  )
}

export default Footer