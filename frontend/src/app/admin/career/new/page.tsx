"use client";

import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface Job {
  title: string;
  experienceLevel: string;
  salaryRange: string;
  employmentType: string;
  description: string;
  location: string;
  jobType: string;
  department: string;
  requirements: { name: string }[];
  responsibilities: { name: string }[];
  skills: string[];
  isActive: boolean;
}

async function JobPost(values: Job, accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/job`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Job creation failed");
  }

  return res.json();
}

export default function CreateJob() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const defaultValues: Job = {
    title: "",
    experienceLevel: "",
    salaryRange: "",
    employmentType: "",
    description: "",
    location: "",
    jobType: "",
    department: "",
    requirements: [{ name: "" }],
    responsibilities: [{ name: "" }],
    skills: [],
    isActive: true,
  };

  const form = useForm<Job>({ defaultValues });

  const responsibilitiesArray = useFieldArray({
    control: form.control,
    name: "responsibilities",
  });

  const requirementsArray = useFieldArray({
    control: form.control,
    name: "requirements",
  });

  const mutation = useMutation({
    mutationFn: (values: Job) => JobPost(values, accessToken),
    onSuccess: () => {
      toast.success("Job posted successfully!");
      form.reset(defaultValues);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const onSubmit: SubmitHandler<Job> = (values) => mutation.mutate(values);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Post a Job</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Content Writer" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the job role"
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Delhi, India" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department */}
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input placeholder="Marketing / IT / Sales" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Employment Type */}
            <FormField
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Type</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-gray-300 p-2"
                      {...field}
                      required
                    >
                      <option value="">Select</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Internship">Internship</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Experience Level */}
            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experience Level</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-gray-300 p-2"
                      {...field}
                    >
                      <option value="">Select</option>
                      <option value="Fresher">Fresher</option>
                      <option value="1-3 years">1-3 years</option>
                      <option value="3-5 years">3-5 years</option>
                      <option value="5+ years">5+ years</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Salary Range */}
            <FormField
              control={form.control}
              name="salaryRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary Range</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. ₹25,000 - ₹40,000 per month"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Responsibilities */}
            <div>
              <Label>Responsibilities</Label>
              {responsibilitiesArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mt-2">
                  <Input
                    {...form.register(
                      `responsibilities.${index}.name` as const
                    )}
                    placeholder="Add responsibility"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => responsibilitiesArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                onClick={() => responsibilitiesArray.append({ name: "" })}
              >
                + Add Responsibility
              </Button>
            </div>

            {/* Requirements */}
            <div>
              <Label>Requirements</Label>
              {requirementsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mt-2">
                  <Input
                    {...form.register(`requirements.${index}.name` as const)}
                    placeholder="Add requirement"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => requirementsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                onClick={() => requirementsArray.append({ name: "" })}
              >
                + Add Requirement
              </Button>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label className="block text-sm font-medium">Skills</Label>
              <div className="flex flex-wrap gap-2 border rounded p-2">
                {form.watch("skills")?.map((kw, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-sm"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => {
                        const newKeywords = form
                          .getValues("skills")
                          ?.filter((_, idx) => idx !== i);
                        form.setValue("skills", newKeywords);
                      }}
                      className="text-gray-600 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}

                <input
                  type=" text"
                  className="flex-1 min-w-[120px] border-none focus:ring-0 focus:outline-none"
                  placeholder="Type keyword and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const value = e.currentTarget.value.trim();
                      if (value) {
                        const current = form.getValues("skills") || [];
                        if (!current.includes(value)) {
                          form.setValue("skills", [...current, value]);
                        }
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Posting..." : "Post Job"}
            </Button>
          </form>
        </Form>
        {mutation.isError && (
          <p className="text-red-500"> {"Something went wrong"} </p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-500"> {"Job posted successfully"} </p>
        )}
      </div>
    </div>
  );
}
