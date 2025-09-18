"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface FormData {
  name: string
  email: string
  phone: string
  departureCity: string
  date: string
  people: string
  message: string
  whatsapp: boolean
}

const createContact = async (formData: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  })
  if (!res.ok) throw new Error("Failed to create contact")
  return res.json()
}

export default function QueryForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    departureCity: "",
    date: "",
    people: "",
    message: "",
    whatsapp: false,
  })

  const mutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      toast.success("Contact created successfully!")
      setFormData({
        name: "",
        email: "",
        phone: "",
        departureCity: "",
        date: "",
        people: "",
        message: "",
        whatsapp: false,
      })
    },
    onError: (error: unknown) => {
      toast.error("Failed to create Contact")
      console.error(error)
    },
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Card className="w-full mx-auto shadow-lg rounded-2xl">
      <CardContent>
        <h2 className="text-xl font-bold text-center mb-6">Get a Free Quote</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input placeholder="Name" name="name" value={formData.name} onChange={handleChange} />
            <Input placeholder="Email" type="email" name="email" value={formData.email} onChange={handleChange} />
            <Input placeholder="Phone No" name="phone" value={formData.phone} onChange={handleChange} />
            <Input placeholder="Departure city" name="departureCity" value={formData.departureCity} onChange={handleChange} />
            <Input type="date" placeholder="Choose date of travel" name="date" value={formData.date} onChange={handleChange} />
            <Input placeholder="No. of people" type="number" name="people" value={formData.people} onChange={handleChange} />
          </div>

          <Textarea placeholder="Message" name="message" value={formData.message} onChange={handleChange} />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="whatsapp"
              checked={formData.whatsapp}
              onCheckedChange={(checked) => setFormData({ ...formData, whatsapp: !!checked })}
            />
            <Label htmlFor="whatsapp" className="text-sm">
              Send me updates for this booking on{" "}
              <span className="text-green-600 font-semibold">WhatsApp</span>
            </Label>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg py-2"
          >
            {mutation.isPending ? "Sending..." : "Send enquiry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
