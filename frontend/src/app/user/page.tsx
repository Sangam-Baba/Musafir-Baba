"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plane,
  FileText,
  BadgeCheck,
  AlertCircle,
  Briefcase,
  Headset,
  CreditCard,
  Bell,
  Wallet,
  Compass,
  Upload,
  History,
  Info,
  ChevronRight,
  ShieldCheck,
  FileBadge,
  TrendingUp,
  TicketPercent,
  LifeBuoy
} from "lucide-react";

interface DashboardSummary {
  user: {
    name: string;
    email: string;
    role: string;
    isVerified: boolean;
    memberSince: string;
    phone: string;
  };
  stats: {
    documentsUploaded: number;
    kycStatus: string;
    totalBookings: number;
    totalPaid: number;
    pendingBalance: number;
  };
  activeServices: any[];
  latestUpdates?: {
    _id: string;
    title: string;
    excerpt: string;
    slug: string;
    type: "news" | "blog";
    createdAt: string;
  }[];
}

const getDashboardSummary = async (token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/user-summary`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load dashboard summary");
  }

  return res.json();
};

export default function UserDashboardPage() {
  const token = useAuthStore((state) => state.accessToken) as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-dashboard-summary"],
    queryFn: () => getDashboardSummary(token),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl col-span-1" />
          <Skeleton className="h-64 rounded-xl col-span-2" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="rounded-xl border-destructive">
          <CardContent className="p-8 text-center text-destructive">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load dashboard. Please refresh the page or log in again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, stats, activeServices, latestUpdates } = (data?.data as DashboardSummary) || {};

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* 1. Warm Welcome & Snapshot */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 rounded-2xl mb-8 border border-primary/10 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
        <div className="mb-6 md:mb-0">
          <h1 className="text-3xl font-extrabold mb-3 text-foreground flex items-center gap-2">
            👋 Welcome, {user?.name?.split(" ")[0] || "Traveler"}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 uppercase tracking-wider text-xs font-semibold px-3 py-1">
              {user?.role === "user" ? "Traveller" : user?.role || "Traveller"}
            </Badge>
            {user?.isVerified ? (
              <Badge variant="outline" className="border-green-500/50 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 gap-1.5 px-3 py-1">
                <BadgeCheck className="w-3.5 h-3.5" /> Profile Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 gap-1.5 px-3 py-1">
                <AlertCircle className="w-3.5 h-3.5" /> Profile Pending
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-4 self-stretch md:self-auto">
          <div className="flex-1 md:flex-none flex flex-col items-center justify-center p-4 bg-background/80 backdrop-blur-sm rounded-xl shadow-sm border border-border">
            <span className="text-2xl font-bold text-foreground mb-1">{stats?.documentsUploaded || 0}/10</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Docs Uploaded</span>
          </div>
          <div className="flex-1 md:flex-none flex flex-col items-center justify-center p-4 bg-background/80 backdrop-blur-sm rounded-xl shadow-sm border border-border">
            <span className={`text-xl font-bold mb-1 ${stats?.kycStatus === "Completed" ? "text-green-500" : "text-yellow-500"}`}>
              {stats?.kycStatus || "Pending"}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">KYC Status</span>
          </div>
        </div>
      </section>

      {/* 2. Active Services Overview */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-primary" /> Active Services
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
            <Link href="/user/bookings">View All History <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
        
        {activeServices?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeServices.map((service, idx) => (
              <Card className="hover:border-primary/50 transition-all hover:shadow-md group cursor-pointer border-border/60" key={service._id || idx}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                      {service.type === "visa" ? <FileBadge className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
                    </div>
                    <Badge variant={service.bookingStatus === "Confirmed" ? "default" : "secondary"} className="capitalize">
                      {service.bookingStatus || "Under Processing"}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg mb-1.5 truncate group-hover:text-primary transition-colors">
                    {service.packageId?.title || service.destination || "Custom Vacation Package"}
                  </h3>
                  <div className="text-sm text-muted-foreground mb-5 flex items-center gap-2">
                    <History className="w-4 h-4 opacity-70" /> 
                    {service.date ? new Date(service.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Dates Flexible"}
                  </div>
                  <Button className="w-full font-semibold" variant={service.bookingStatus === 'Confirmed' ? "outline" : "default"} asChild>
                    <Link href="/user/bookings">
                      {service.bookingStatus === 'Confirmed' ? 'View Itinerary' : 'Upload Documents'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {/* Mock Visa Service Card just for UI consistency if they only have trips */}
            {activeServices.length < 2 && (
              <Card className="hover:border-primary/50 transition-all hover:shadow-md group cursor-pointer border-border/60 bg-slate-50/50 dark:bg-slate-900/50">
                <CardContent className="p-6 opacity-70">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                      <FileBadge className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-muted-foreground border-dashed">Draft</Badge>
                  </div>
                  <h3 className="font-bold text-lg mb-1.5 truncate">Dubai Tourist Visa</h3>
                  <p className="text-sm text-muted-foreground mb-5">Start an application today</p>
                  <Button className="w-full font-semibold" variant="outline" asChild>
                    <Link href="/visa">Apply Now</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                <Compass className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="text-xl font-bold mb-2">You don't have any active bookings yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Ready for your next adventure? Explore our curated packages or apply for a visa.
              </p>
              <Button size="lg" className="rounded-full px-8" asChild>
                <Link href="/holidays">Explore Packages</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* 3. Next Action Panel */}
        <Card className="lg:col-span-1 border-primary/20 bg-gradient-to-br from-background to-primary/5 dark:from-slate-900 dark:to-primary/10 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-xl">
              <div className="p-1.5 bg-background rounded-md shadow-sm">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.pendingBalance > 0 ? (
              <div className="space-y-5">
                <div className="bg-background rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Pending Amount due</p>
                  <p className="font-bold text-2xl text-foreground">₹{stats.pendingBalance.toLocaleString()}</p>
                </div>
                <Button className="w-full text-base font-semibold shadow-md hover:shadow-lg transition-all" size="lg">
                  Complete Payment Now
                </Button>
              </div>
            ) : stats?.kycStatus !== "Completed" ? (
              <div className="space-y-5">
                <div className="bg-background/80 rounded-lg p-4 border border-border/50 flex gap-3">
                  <FileText className="w-8 h-8 text-yellow-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">KYC Incomplete</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Upload your passport copy to secure your bookings and expedite processing.
                    </p>
                  </div>
                </div>
                <Button className="w-full text-base font-semibold" size="lg" asChild>
                  <Link href="/user/documents">Upload Documents</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <div className="bg-green-500/10 p-4 rounded-full">
                  <ShieldCheck className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <p className="font-bold text-lg text-green-600 dark:text-green-400">All caught up!</p>
                  <p className="text-sm text-muted-foreground">You have no pending actions to take.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Booking & Payment Snapshot */}
        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="flex items-center gap-2.5 text-xl">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              Booking & Financial Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
              <div className="p-6 flex flex-col items-center md:items-start text-center md:text-left">
                <span className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><History className="w-4 h-4"/> Total Bookings</span>
                <span className="text-4xl font-extrabold text-foreground">{stats?.totalBookings || 0}</span>
              </div>
              <div className="p-6 flex flex-col items-center md:items-start text-center md:text-left">
                <span className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><CreditCard className="w-4 h-4"/> Total Amount Paid</span>
                <span className="text-4xl font-extrabold text-green-600 dark:text-green-500 hidden md:block lg:text-3xl xl:text-4xl truncate w-full">₹{stats?.totalPaid?.toLocaleString() || 0}</span>
                <span className="text-4xl font-extrabold text-green-600 dark:text-green-500 md:hidden">₹{stats?.totalPaid?.toLocaleString() || 0}</span>
              </div>
              <div className="p-6 flex flex-col items-center md:items-start text-center md:text-left bg-muted/10">
                <span className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> Pending Balance</span>
                <span className="text-4xl font-extrabold text-foreground hidden md:block lg:text-3xl xl:text-4xl truncate w-full">₹{stats?.pendingBalance?.toLocaleString() || 0}</span>
                <span className="text-4xl font-extrabold text-foreground md:hidden">₹{stats?.pendingBalance?.toLocaleString() || 0}</span>
              </div>
            </div>
            <div className="p-4 bg-muted/20 border-t border-border/40 flex justify-end gap-3 rounded-b-xl">
              <Button variant="outline" className="bg-background" size="sm">View Invoices</Button>
              {stats?.pendingBalance > 0 && <Button size="sm">Make Payment</Button>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 space-y-8">
          {/* 5. Quick Access Shortcuts */}
          <section>
            <h2 className="text-xl font-bold mb-4 mx-1">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ShortcutCard icon={Upload} label="Upload Documents" href="/user/documents" color="text-blue-500" bg="bg-blue-500/10" />
              <ShortcutCard icon={History} label="My Bookings" href="/user/bookings" color="text-purple-500" bg="bg-purple-500/10" />
              <ShortcutCard icon={FileBadge} label="Visa Status" href="/visa" color="text-green-500" bg="bg-green-500/10" />
              <ShortcutCard icon={Headset} label="Talk to Support" href="/contact-us" color="text-pink-500" bg="bg-pink-500/10" />
              <ShortcutCard icon={Compass} label="Explore Packages" href="/holidays" color="text-primary" bg="bg-primary/10" />
              <ShortcutCard icon={TicketPercent} label="My Offers" href="/user/my-offers" color="text-yellow-500" bg="bg-yellow-500/10" />
            </div>
          </section>

          {/* 6. Alerts, Updates & Announcements */}
          <section>
            <div className="flex items-center justify-between mb-4 mx-1">
              <h2 className="text-xl font-bold flex items-center gap-2"><Info className="w-5 h-5 text-primary" /> Latest Updates</h2>
            </div>
            <Card className="shadow-sm border-border/60 overflow-hidden">
              <div className="divide-y divide-border/40">
                {latestUpdates && latestUpdates.length > 0 ? (
                  latestUpdates.map((update, idx) => (
                    <Link href={`/${update.type === "news" ? "news" : "blog"}/${update.slug}`} key={update._id || idx}>
                      <div className="p-4 flex gap-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                        <div className={`p-2.5 rounded-full shrink-0 h-min ${update.type === "news" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-600"}`}>
                          {update.type === "news" ? <Bell className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        </div>
                        <div className="w-full">
                          <div className="flex flex-col gap-1 mb-1">
                            <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">{update.title}</h4>
                            <span className="text-[10px] text-muted-foreground w-max whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-full font-medium">
                              {new Date(update.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mr-4 line-clamp-2">{update.excerpt || "Click to read more details."}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <Info className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm">No recent updates available at the moment.</p>
                  </div>
                )}
              </div>
            </Card>
          </section>
        </div>

        <div className="lg:col-span-1 space-y-8">
          {/* 7. Support & Trust Section */}
          <section>
            <h2 className="text-xl font-bold mb-4 mx-1">Need Help?</h2>
            <Card className="shadow-sm border-border/60 overflow-hidden">
              <div className="bg-slate-900 text-white p-5">
                <div className="flex items-center gap-3 mb-3">
                  <LifeBuoy className="w-6 h-6 text-primary" />
                  <h3 className="font-bold text-lg">Your Support Team</h3>
                </div>
                <p className="text-sm text-slate-300 opacity-90">We're here to make your travel seamless and worry-free.</p>
              </div>
              <CardContent className="p-5 space-y-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Relationship Manager</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      RM
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Rahul Sharma</p>
                      <p className="text-xs text-muted-foreground">+91 98765 43210</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">24/7 Emergency Support</p>
                  <p className="font-medium text-sm flex items-center gap-2"><Headset className="w-4 h-4 text-primary"/> +91 1800 123 4567</p>
                </div>
                <Button className="w-full font-semibold" variant="outline">Raise Support Ticket</Button>
              </CardContent>
            </Card>
          </section>

          {/* 8. Soft Upsell */}
          <section>
            <Card className="shadow-sm border-primary/20 bg-primary/5">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm mb-1">Travelling soon?</h4>
                  <p className="text-xs text-muted-foreground pr-2">Add comprehensive travel insurance to your trip in just 1 click.</p>
                </div>
                <Button size="sm" className="whitespace-nowrap shrink-0 max-w-[100px] px-3">Add Policy</Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

// Helper Shortcut Card Component
function ShortcutCard({ icon: Icon, label, href, color, bg }: { icon: any, label: string, href: string, color: string, bg: string }) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer h-full group">
        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3 h-full">
          <div className={`${bg} ${color} p-3 rounded-xl transition-transform group-hover:scale-110 duration-300`}>
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold group-hover:text-primary transition-colors">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
