import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { z } from "zod"
import { useRouter } from "next/navigation"
import React from "react"
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  packageId: z.string(),
})

type FormData = z.infer<typeof formSchema>

const createItinerary = async (data: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to create contact")
  return res.json()
}
export function ItineryDialog({title, description, url, img , packageId}:{title:string, description:string, url:string, img:string , packageId:string}) {
    const router= useRouter();
    const [data, setData] = React.useState<FormData>({
      email: "",
      packageId: packageId
    })
    const [loading, setLoading] = React.useState(false)
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setData({
        ...data,
        [e.target.name]: e.target.value,
      })
    }
    const handleSubmit = async (e: React.FormEvent) => {
         e.preventDefault()
      try {
        setLoading(true)
        formSchema.parse(data)
        await createItinerary(data)
        router.push(url)
      } catch (error) {
        console.log(error)
      }
      finally{
        setLoading(false)
      }
    }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={"lg"}  className="bg-[#FE5300] hover:bg-[#e04a00] text-white hover:text-white">Download Itinerary</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="flex flex-row gap-4">
            <Image
              src={img}
              width={100}
              height={100}
              alt={title}
              className="rounded-lg"
            />
            <div className="flex flex-col gap-2">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="line-clamp-2">
                {description}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={data.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Download"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}