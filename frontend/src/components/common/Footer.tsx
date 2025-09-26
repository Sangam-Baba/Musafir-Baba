import React from 'react'
import Image from 'next/image';
import logo from "../../../public/logo.svg"
import Map from '../custom/Map';
import { MapPin, Phone , Facebook , Twitter , Linkedin, Instagram , Youtube, LucideTwitter } from 'lucide-react';
import Newslatter from './Newslatter';
import FooterItem from '../custom/FooterItem';
import LowerFooterItem from '../custom/LowerFooter';
import Link from 'next/link';
function Footer() {
  return (
    <div className=''>
        <Newslatter />
        <div className='flex flex-col md:flex-row gap-6 mb-8 py-15 px-4 md:px-10 lg:px-25  items-center md:items-start justify-between '>
            <div className="md:w-1/4 flex flex-col gap-2 ">
               <FooterItem title="Service" />  
            </div>
            <div className="md:w-1/4 flex flex-col gap-2">
               <FooterItem title="Domestic Trips "  />  
               <FooterItem title="International Trips"  /> 
            </div>
            <div className="md:w-1/4 flex flex-col gap-2">
               <FooterItem title="About Us" />         
            </div>
            <div className='md:w-1/4 space-y-4'>
                <Image src={logo} alt="logo" />
                <div className='flex flex-col py-2 gap-4'>
                    <div className='flex'>
                        <MapPin size={40} color="#FE5300" className='w-[10%] h-6  ' />
                       <p className='flex justify-start w-[90%]'>1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043</p>
                    </div>
                    <div className='flex'>
                        <Phone size={40} color="#FE5300" className='w-[10%] h-6  ' />
                       <p className='flex justify-start w-[90%]'>Tour: +91 92896 02447 | Visa: +91 93556 63591</p>
                    </div>
                    <Map address="1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043" />
                    <div className='flex gap-4 item-center space-y-4'>
                         <Link href="https://www.youtube.com/@hello_musafirbaba"> <Youtube  color="#FE5300"  className="w-5 h-5 "/> </Link>
                          <Link href="http://facebook.com/hellomusafirbaba"> <Facebook  color="#FE5300"fill="white" className="w-5 h-5" />      </Link>
                         <Link href="https://x.com/Musafircare"> <LucideTwitter color="#FE5300" fill="white" className="w-5 h-5" /> </Link>
                          <Link href="https://www.instagram.com/hello_musafirbaba"><Instagram  color="#FE5300" className="w-5 h-5" /> </Link>
                          <Link href="https://in.linkedin.com/company/musafirbaba"><Linkedin color="#FE5300" fill="white" className="w-5 h-5" /> </Link>
                    </div>
                </div>
                
            </div>
            
        </div>
        <div className='border-t border-gray-200 mb-8 py-15 px-4 md:px-10 lg:px-25  items-center md:items-start justify-between'>
            <div className='flex flex-col gap-2 pb-4'>
               <p className='text-2xl font-bold'>Quick Links</p>
               <p className='h-1 w-[5%] bg-[#FE5300]'></p>
            </div>
            <div>
                <LowerFooterItem />  

            </div>

        </div>
        <div className='text-center py-4 border-t border-gray-200 px-4'>
            <p>Copyright © 2020 - 2025 | Musafirbaba Travels Pvt. Ltd. | All Rights Reserved.</p>
        </div>
    </div>
  )
}

export default Footer