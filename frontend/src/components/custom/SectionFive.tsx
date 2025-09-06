import React from 'react'
import { Card } from '../ui/card'
import { CardContent } from '../ui/card'
import Image from 'next/image';
import van from '../../../public/van.webp';

function SectionFive() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
     <div className='max-w-7xl mx-auto flex gap-12'>
        <div className='w-1/2'>
            <Image src={van} w-fit="true" alt="h1" />
        </div>
        
        <Card className="w-1/2 group cursor-pointer overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition">
                {/* <div className="relative h-40 w-full overflow-hidden">
                  <Image
                     width={500}
                     height={500}
                    src={van}
                    alt="van"
                    className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{cat.title}</h3>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </CardContent>   */}
        </Card>
     </div>
    </section>
  )
}

export default SectionFive