import { Smile , Star , Route } from 'lucide-react'
import React from 'react'

function SecondSection() {
  return (
    <section className='w-full px-4 md:px-8 lg:px-20 py-16'>
    <div className='max-w-7xl mx-auto flex justify-around  items-center px-8 py-4'>
        <div className='flex flex-col gap-2 items-center'>
            <Smile size={100} color='#FF5733'/>
            <h1 className='text-2xl font-bold'>10,000+</h1>
            <p className='text-sm '>Happy Travellers</p>
        </div>
        <div className='flex flex-col gap-2 items-center'>
            <Star size={100} color='#FF5733'/>
            <h1 className='text-2xl font-bold'>4.7/5</h1>
            <p className='text-sm '>Google Ratings</p>
        </div>
        <div className='flex flex-col gap-2 items-center'>
            <Route  size={100} color='#FF5733'/>
            <h1 className='text-2xl font-bold'>200+</h1>
            <p className='text-sm '>Tour Packages</p>
        </div>
    </div>
    </section>
  )
}

export default SecondSection