"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
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
import { useEffect } from "react";
import { toast } from "sonner";

const designations = [
  // Management / Leadership
  "Founder",
  "Co-Founder",
  "CEO",
  "COO",
  "CTO",
  "CMO",
  "Director",
  "VP Engineering",
  "VP Marketing",
  "General Manager",
  "Operations Manager",

  // Business Development / Sales
  "Business Development Executive",
  "Business Development Manager",
  "Sales Executive",
  "Sales Manager",
  "IT Sales Executive",
  "Lead Generation Executive",
  "Upwork Bidder",
  "Freelancer Platform Specialist",
  "Account Executive",
  "Client Acquisition Specialist",
  "Pre-Sales Consultant",
  "Partnership Manager",

  // Project Management
  "Project Coordinator",
  "Project Manager",
  "Technical Project Manager",
  "Scrum Master",
  "Product Manager",
  "Product Owner",
  "Delivery Manager",
  "Agile Coach",

  // Software Development
  "Frontend Developer",
  "React Developer",
  "Next.js Developer",
  "Angular Developer",
  "Vue.js Developer",
  "UI Developer",
  "Backend Developer",
  "Node.js Developer",
  "Python Developer",
  "FastAPI Developer",
  "PHP Developer",
  "Laravel Developer",
  "Java Developer",
  ".NET Developer",
  "Full Stack Developer",
  "MERN Stack Developer",
  "MEAN Stack Developer",
  "Android Developer",
  "iOS Developer",
  "Flutter Developer",
  "React Native Developer",
  "Senior Software Engineer",
  "Lead Developer",
  "Technical Lead",
  "Solution Architect",
  "Software Architect",

  // DevOps / Cloud / Infrastructure
  "DevOps Engineer",
  "Cloud Engineer",
  "AWS Engineer",
  "Site Reliability Engineer",
  "Infrastructure Engineer",
  "Linux Administrator",
  "System Administrator",
  "Kubernetes Engineer",
  "CI/CD Engineer",
  "Network Engineer",

  // QA / Testing
  "QA Engineer",
  "Software Tester",
  "Manual Tester",
  "Automation Tester",
  "QA Analyst",
  "Performance Tester",
  "Security Tester",
  "Test Lead",

  // UI/UX & Design
  "UI Designer",
  "UX Designer",
  "UI/UX Designer",
  "Graphic Designer",
  "Motion Graphic Designer",
  "Web Designer",
  "Product Designer",
  "Brand Designer",
  "Creative Director",

  // Digital Marketing
  "SEO Executive",
  "SEO Specialist",
  "SEO Analyst",
  "Technical SEO Expert",
  "Local SEO Specialist",
  "Link Building Specialist",
  "PPC Expert",
  "Google Ads Specialist",
  "Meta Ads Specialist",
  "Performance Marketer",
  "Media Buyer",
  "Social Media Executive",
  "Social Media Manager",
  "Community Manager",
  "Instagram Manager",
  "Email Marketing Specialist",
  "Marketing Automation Specialist",
  "CRM Specialist",
  "Digital Marketing Analyst",
  "Web Analytics Specialist",
  "Conversion Rate Optimization Specialist",

  // Content
  "Content Writer",
  "Copywriter",
  "Technical Writer",
  "Blog Writer",
  "Script Writer",
  "Content Strategist",
  "Content Manager",
  "Editor",
  "Proofreader",

  // Video & Media
  "Video Editor",
  "Motion Graphics Artist",
  "Animator",
  "Videographer",
  "YouTube Content Editor",
  "Reels Editor",

  // Customer Support / Client Success
  "Customer Support Executive",
  "Technical Support Engineer",
  "Client Success Manager",
  "Account Manager",
  "Customer Relationship Manager",
  "Helpdesk Executive",

  // HR & Recruitment
  "HR Executive",
  "HR Manager",
  "Talent Acquisition Specialist",
  "Recruiter",
  "Technical Recruiter",
  "HR Business Partner",

  // Finance & Accounts
  "Accountant",
  "Finance Executive",
  "Accounts Manager",
  "Payroll Executive",
  "Financial Analyst",
  "Billing Executive",

  // Data & AI
  "Data Analyst",
  "Data Engineer",
  "Data Scientist",
  "AI Engineer",
  "Machine Learning Engineer",
  "Prompt Engineer",
  "AI Automation Specialist",

  // Security
  "Cybersecurity Analyst",
  "Security Engineer",
  "Penetration Tester",
  "SOC Analyst",
  "Information Security Manager"
];

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.coerce.number().min(10, {
    message: "Please enter a valid phone number.",
  }),
  password: z.string().optional(),
  role: z.enum(["admin", "staff"]).default("staff"),
  permissions: z.array(z.string()).optional(),
  designation: z.string().min(1, {
    message: "Designation is required.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const createStaff = async (
  values: FormValues,
  accessToken: string,
  role: string,
) => {
  let res;
  if (role === "admin") {
    res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authprization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    });
  } else {
    res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authprization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    });
  }
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
};

const updateStaff = async (
  values: FormValues,
  accessToken: string,
  id: string,
  role: string,
) => {
  let res;
  if (role === "admin") {
    res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    });
  } else {
    res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    });
  }
  if (!res.ok) throw new Error("Update failed");
  return res.json();
};
const getStaff = async (accessToken: string, id: string, role: string) => {
  let res;
  if (role === "admin") {
    res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } else {
    res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
  if (!res.ok) throw new Error("Failed to fetch staff");
  const data = await res.json();
  return data?.data;
};
import { NAV_GROUPS } from "@/config/navigation";

function CreateEditStaff({
  id,
  onClose,
  role,
}: {
  id?: string | null;
  onClose: () => void;
  role: "admin" | "user";
}) {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const QueryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: 0,
      role: "staff",
      permissions: [],
      designation: "",
    },
  });

  const {
    data: staff,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaff(accessToken, id as string, role),
    retry: 2,
    enabled: id !== null,
  });

  useEffect(() => {
    if (staff) {
      form.setValue("name", staff.name);
      form.setValue("email", staff.email);
      form.setValue("phone", staff.phone);
      form.setValue("role", staff.role || "staff");
      form.setValue("permissions", staff.permissions);
      form.setValue("designation", staff.designation || "");
    }
  }, [staff, accessToken, form]);
  const mutate = useMutation({
    mutationFn: (values: FormValues) =>
      id
        ? updateStaff(values, accessToken, id, role)
        : createStaff(values, accessToken, role),
    onSuccess: () => {
      toast.success("Staff created successfully");
      QueryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      console.log(err);
      toast.error(err.message);
    },
  });
  function onSubmit(values: FormValues) {
    if (!id && !values.password) return alert("Please enter a password");
    console.log("thi sis is value", values);
    mutate.mutate(values);
  }

  // Dynamically generate the permission categories from NAV_GROUPS
  const dynamicPermissionGroups = NAV_GROUPS.map((group) => {
    // Unique permissions in this group
    const uniqueItems: { label: string; permission: string }[] = [];
    const seenPermissions = new Set<string>();

    group.items.forEach((item) => {
      if (!seenPermissions.has(item.permission)) {
        seenPermissions.add(item.permission);
        uniqueItems.push({
          label: item.label,
          permission: item.permission,
        });
      }
    });

    return {
      label: group.label,
      items: uniqueItems,
    };
  });

  return (
    <div className="flex flex-col max-w-2xl min-w-[500px] max-h-[90vh] overflow-auto bg-gray-50 px-4 py-6 rounded-lg shadow-md">
      {isError && <p>{(error as Error).message}</p>}
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter staff name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Email</FormLabel>
                  <FormControl>
                    <Input placeholder="staff@gmail.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Phone</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="7880896559" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Role</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full p-2 border rounded-md bg-white text-sm"
                    >
                      <option value="staff">Staff (Permission Based)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full p-2 border rounded-md bg-white text-sm"
                    >
                      <option value="" disabled>Select Designation</option>
                      {designations.map((des) => (
                        <option key={des} value={des}>{des}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === "admin" && (
              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Permissions</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-4">
                        {dynamicPermissionGroups.map((group, i) => (
                          <div key={i} className="border-b pb-4 last:border-0">
                            <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wider">{group.label}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                              {group.items.map((item, idx) => (
                                <label
                                  key={idx}
                                  className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    value={item.permission}
                                    checked={field.value?.includes(item.permission)}
                                    onChange={(e) => {
                                      const current = field.value || [];
                                      if (e.target.checked) {
                                        field.onChange([...current, item.permission]);
                                      } else {
                                        field.onChange(current.filter((p) => p !== item.permission));
                                      }
                                    }}
                                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                  />
                                  <span>{item.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4 px-4">
              <Button className="bg-[#FE5300] hover:bg-[#FE5300]" type="submit">
                Submit
              </Button>
              <Button
                className="bg-red-400 hover:bg-red-600"
                type="button"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </form>
        </Form>
      )}
      {mutate.isSuccess && <div>Staff created successfully</div>}
      {mutate.isError && <div>Something went wrong</div>}
    </div>
  );
}

export default CreateEditStaff;
