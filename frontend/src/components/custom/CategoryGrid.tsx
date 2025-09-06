"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import Image from "next/image"
type Category = {
  id: string
  name: string
  slug: string
  image: string
  description?: string
}

interface CategoryGridProps {
  categories: Category[]
  limit?: number
  title?: string
  url?: string
}

export default function CategoryGrid({ categories, limit, title, url }: CategoryGridProps) {
  const displayed = limit ? categories.slice(0, limit) : categories

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-12">
      {title && (
        <div className="flex flex-col gap-2 items-center mb-8">
        <h2 className="text-2xl font-bold text-center">{title}</h2>
        <div className="w-20 h-1 bg-[#FE5300]"></div>
       </div> 
      )}

      <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {displayed.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={`${url}/${cat.slug}`}>
              <Card className="group cursor-pointer overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition">
                <div className="relative h-40 w-full overflow-hidden">
                  <Image
                     width={500}
                     height={500}
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
