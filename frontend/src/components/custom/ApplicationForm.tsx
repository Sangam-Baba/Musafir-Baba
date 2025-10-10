"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  UserRound,
  Mail,
  Phone,
  GraduationCap,
  FileText,
  User2,
} from "lucide-react";
import ImageUploader from "../admin/ImageUploader";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  age: number;
  experience: string;
  coverLetter: string;
  resumeUrl: string;
  jobId: string;
  hightestQualification: string;
}
interface Job {
  _id: string;
  title: string;
}

const createApplication = async (formData: FormData) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/jobapplication`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    }
  );
  if (!res.ok) throw new Error("Failed to create contact");
  return res.json();
};

const getAllJobs = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/job`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  const data = await res.json();
  return data;
};
export default function ApplicationForm() {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    age: 0,
    experience: "Fresher",
    coverLetter: "",
    resumeUrl: "",
    jobId: "",
    hightestQualification: "",
  });

  const mutation = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      toast.success("Thank you for your application!");
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        age: 0,
        experience: "Fresher",
        coverLetter: "",
        resumeUrl: "",
        jobId: "",
        hightestQualification: "",
      });
    },
    onError: () => {
      toast.error("Failed to submit application");
    },
  });

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: getAllJobs,
  });
  const jobs = data?.data ?? [];
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="flex justify-center px-4 py-4 w-full max-w-7xl">
      <Card className="w-full shadow-xl rounded-2xl border border-gray-200 bg-white">
        <CardContent className="p-6 sm:p-10">
          <h2 className="text-2xl font-semibold text-center mb-8 text-gray-800">
            Apply for Job
          </h2>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 items-center "
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Name */}
                <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                  <UserRound className="w-5 h-5 text-[#FE5300]" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="ml-3 w-full border-none outline-none bg-transparent text-gray-700 placeholder-gray-400"
                  />
                </div>

                {/* Email */}
                <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                  <Mail className="w-5 h-5 text-[#FE5300]" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="ml-3 w-full border-none outline-none bg-transparent text-gray-700 placeholder-gray-400"
                  />
                </div>

                {/* Phone */}
                <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                  <Phone className="w-5 h-5 text-[#FE5300]" />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="ml-3 w-full border-none outline-none bg-transparent text-gray-700 placeholder-gray-400"
                  />
                </div>
                {/* Phone */}
                <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                  <User2 className="w-5 h-5 text-[#FE5300]" />
                  <input
                    type="number"
                    placeholder="Your Age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                    className="ml-3 w-full border-none outline-none bg-transparent text-gray-700 placeholder-gray-400"
                  />
                </div>

                {/* Qualification */}
                <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                  <GraduationCap className="w-5 h-5 text-[#FE5300]" />
                  <select
                    name="hightestQualification"
                    value={formData.hightestQualification}
                    onChange={handleChange}
                    required
                    className="ml-3 w-full border-none outline-none bg-transparent text-gray-700 placeholder-gray-400"
                  >
                    <option value="">Select Qualification</option>
                    <option value="Bachelors">Bachelors</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Masters">Masters</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Experience */}
                <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                  <FileText className="w-5 h-5 text-[#FE5300]" />
                  <input
                    placeholder="Experience (e.g. 2 years, Fresher)"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="ml-3 w-full border-none outline-none bg-transparent text-gray-700 placeholder-gray-400"
                  />
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    required
                    className="ml-3 w-full border-none outline-none bg-transparent text-gray-700 placeholder-gray-400"
                  >
                    <option value="">Select Qualification</option>
                    <option value="Fresher">Fresher</option>
                    <option value="1-3 years">1-3 years</option>
                    <option value="3-5 years">3-5 years</option>
                    <option value="5+ years">5+ years</option>
                  </select>
                </div>

                {/* Resume URL */}
                <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                  <ImageUploader
                    onUpload={(img) => {
                      if (!img) return null;
                      formData.resumeUrl = img.url;
                    }}
                  />
                </div>

                {/* Job ID */}
                <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                  <select
                    name="jobId"
                    value={formData.jobId}
                    onChange={handleChange}
                    required
                    className="ml-3 w-full border-none outline-none bg-transparent text-gray-700 placeholder-gray-400"
                  >
                    <option value="">Select Positions</option>
                    {jobs.map((job: Job) => (
                      <option key={job._id} value={job._id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cover Letter */}
                <Textarea
                  placeholder="Write your cover letter or message..."
                  name="coverLetter"
                  value={formData.coverLetter}
                  onChange={handleChange}
                  rows={4}
                  className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-[200px]  bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl py-3 shadow-md transition"
            >
              {mutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
