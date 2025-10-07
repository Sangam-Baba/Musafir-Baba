"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserRound, Mail, Phone } from "lucide-react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  whatsapp: boolean;
}

const createContact = async (formData: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  return res.json();
};

export default function QueryForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
    whatsapp: false,
  });

  const mutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      toast.success("Contact created successfully!");
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
        whatsapp: false,
      });
    },
    onError: (error: unknown) => {
      toast.error("Failed to create Contact");
      console.error(error);
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Card className="w-full mx-auto  rounded-2xl">
      <CardContent>
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
          Get a Free Quote
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-1 focus-within:ring-orange-500 transition">
            <UserRound className="w-5 h-5 text-[#FE5300] flex-shrink-0" />
            <input
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="ml-3 w-full border-none outline-none focus:ring-0 bg-transparent text-gray-700 placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-1 focus-within:ring-orange-500 transition">
              <Mail className="w-5 h-5 text-[#FE5300] flex-shrink-0" />
              <input
                placeholder="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="ml-3 w-full border-none outline-none focus:ring-0 bg-transparent text-gray-700 placeholder-gray-400"
              />
            </div>

            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-1 focus-within:ring-orange-500 transition">
              <Phone className="w-5 h-5 text-[#FE5300] flex-shrink-0" />
              <input
                placeholder="Phone No"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="ml-3 w-full border-none outline-none focus:ring-0 bg-transparent text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          <Textarea
            placeholder="Message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-700 placeholder-gray-400"
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="whatsapp"
              checked={formData.whatsapp}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, whatsapp: !!checked })
              }
            />
            <Label htmlFor="whatsapp" className="text-sm text-gray-700">
              Send me updates on{" "}
              <span className="text-green-600 font-semibold">WhatsApp</span>
            </Label>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg py-2 transition"
          >
            {mutation.isPending ? "Sending..." : "Send enquiry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
