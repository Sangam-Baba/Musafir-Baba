import React from 'react'
import Image from 'next/image';
import logo from "../../../public/logo.svg"
import { MapPin } from 'lucide-react';
function Footer() {
  return (
    <div className=''>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 py-8 px-8 border-t border-gray-200'>
            <div className='grid gap-2'>
                <Image src={logo} alt="logo" />
                <p className='flex gap-2'> 
                    <MapPin size={20} color='#FE5300' strokeWidth={4}/> Phone: +91-92896 02447 /011- 4653 4314
                </p>
                <p className='flex gap-2'>
                   <MapPin size={20} color='#FE5300' strokeWidth={4}/> Email: support@musafirbaba.com
                </p>
            </div>
            <div className="flex gap-2">
                <MapPin size={30} color='#FE5300' strokeWidth={4}/>
                <p>Musafir Baba - Best Travel Agency in Delhi | Tour Packages & Tourist Visas - Plot no. 2 & 3, 1st Floor, Khaira Mor, Near Dhansa Bus Stand Metro Station, Gate no. 1, Najafgarh, New Delhi, Delhi - 110043, India</p>
            </div>
            <div className="flex gap-2">
                <MapPin size={20} color='#FE5300' strokeWidth={4}/>
                <p>Musafirbaba Travels (MBT) - Domestic Branch Kalyan | Surat | Ahmedabad | Gorakhpur | Lucknow | Bengaluru</p>
            </div>
            <div className="flex gap-2">
                <MapPin size={20} color='#FE5300' strokeWidth={4}/> 
                <p>Musafirbaba Travels (MBT) - Overseas Branch Dubai | Kathmandu | Hanoi | Marina Bay | Phuket | Ontario</p>
            </div>
        </div>
        <div className='text-center py-4 border-t border-gray-200'>
            <p>Copyright © 2020 - 2025 | Musafirbaba Travels Pvt. Ltd. | All Rights Reserved.</p>
        </div>
    </div>
  )
}

export default Footer