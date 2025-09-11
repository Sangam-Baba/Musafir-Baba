"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Calendar } from "lucide-react"

export default function QueryForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    departureCity: "",
    date: "",
    people: "",
    message: "",
    whatsapp: false,
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type,  } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? e : value,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form Submitted:", formData)
    // TODO: Send API request here
  }

  return (
    <Card className="w-full mx-auto shadow-lg rounded-2xl">
      <CardContent className="">
        <h2 className="text-xl font-bold text-center mb-6">Get a Free Quote</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <Input
              placeholder="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
            <Input
              placeholder="Phone No"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
            <Input
              placeholder="Departure city"
              name="departureCity"
              value={formData.departureCity}
              onChange={handleChange}
            />
            <Input
              type="date"
              placeholder="Choose date of travel"
              name="date"
              value={formData.date}
              onChange={handleChange}
            />
            <Input
              placeholder="No. of people"
              type="number"
              name="people"
              value={formData.people}
              onChange={handleChange}
            />
          </div>

          <Textarea
            placeholder="Message"
            name="message"
            value={formData.message}
            onChange={handleChange}
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="whatsapp"
              name="whatsapp"
              checked={formData.whatsapp}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, whatsapp: !!checked })
              }
            />
            <Label htmlFor="whatsapp" className="text-sm">
              Send me updates for this booking on{" "}
              <span className="text-green-600 font-semibold">WhatsApp</span>
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg py-2"
          >
            Send enquiry
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
