"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-dropdown-menu";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  destination: z.string().min(2, {
    message: "Destination must be at least 2 characters.",
  }),
  price: z.number().min(1, {
    message: "Price must be at least 1.",
  }),
  duration: z.object({
    fixed: z.object({
      startdate: z.date(),
      enddate: z.date(),
      totalDays: z.number().min(1, {
        message: "totalDays must be at least 1 day.",
      }),
    }),
    flexible: z.object({
      month: z.string(),
      totalDays: z.number().min(1, {
        message: "totalDays must be at least 1 day.",
      }),
    }),
  }),
  city: z.array(
    z.object({
      name: z.string().min(2, {
        message: "City must be at least 2 characters.",
      }),
    })
  ),
  transport: z.array(
    z.object({
      vehicleType: z.string().min(2, {
        message: "Vehicle Type must be at least 2 characters.",
      }),
      price: z.number().min(1, {
        message: "Price must be at least 1.",
      }),
      maxPeople: z.number().min(1, {
        message: "Max People must be at least 1.",
      }),
    })
  ),
  hotel: z.array(
    z.object({
      star: z.string().min(2, {
        message: "Star must be at least 2 characters.",
      }),
      quadprice: z.number().min(1, {
        message: "Quad Price must be at least 1.",
      }),
      doubleprice: z.number().min(1, {
        message: "Double Price must be at least 1.",
      }),
      tripleprice: z.number().min(1, {
        message: "Triple Price must be at least 1.",
      }),
    })
  ),
  mealType: z.array(
    z.object({
      name: z.string().min(2, {
        message: "Meal name must be at least 2 characters.",
      }),
      price: z.number().min(1, {
        message: "Price must be at least 1.",
      }),
    })
  ),
  activities: z.array(
    z.object({
      name: z.string().min(2, {
        message: "Activity name must be at least 2 characters.",
      }),
      price: z.number().min(1, {
        message: "Price must be at least 1.",
      }),
    })
  ),
  tourGuide: z.array(
    z.object({
      name: z.string().min(2, {
        message: "Tour guide name must be at least 2 characters.",
      }),
      price: z.number().min(1, {
        message: "Price must be at least 1.",
      }),
    })
  ),
  status: z.string().min(2, {
    message: "Status must be at least 2 characters.",
  }),
});
