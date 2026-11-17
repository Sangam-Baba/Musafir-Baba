"use client";
// Public page at /business for visitors who are not signed in. It only describes what works today:
// hotel supplier sign-up, verification, listings with rooms and photos, where a listing is shown, team access.
import { ArrowRight, BadgeCheck, Camera, CheckCircle2, Eye, FileCheck2, Headphones, Hotel, LogIn, ShieldCheck, UserPlus, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SUPPORT } from "../../support";
import { BANNER_IMAGE } from "../portal/ui";

const BENEFITS = [
  { icon: BadgeCheck, title: "Verified partner", text: "Your business is checked once (PAN, GST, documents) so travellers and agents can trust it." },
  { icon: Camera, title: "Your listing, your way", text: "Details, location, policies, amenities, room types and photos — all from one place." },
  { icon: Eye, title: "Choose where it's shown", text: "Turn each property on or off separately for musafirbaba.com and for travel businesses." },
  { icon: Users, title: "Your whole team", text: "Invite staff with their own sign-in and give each one only the access they need." },
  { icon: ShieldCheck, title: "Secure by default", text: "Two-step login, signed-in device control and a full activity log." },
  { icon: Headphones, title: "A real partner team", text: "People at MusafirBaba who help with onboarding, verification and listings." },
];

const STEPS = [
  { icon: UserPlus, title: "Register", text: "Create your account and add your business details." },
  { icon: FileCheck2, title: "Get verified", text: "Upload your documents; MusafirBaba reviews them, usually within 1–2 working days." },
  { icon: Hotel, title: "List your property", text: "Add rooms, photos and policies, then submit the listing." },
  { icon: CheckCircle2, title: "Go live", text: "Once approved, your property is live where you chose to show it." },
];

function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo-white.svg" alt="MusafirBaba" width={170} height={29} className="h-8 w-auto" priority />
          <span className="hidden border-l border-white/30 pl-3 text-sm text-white/80 sm:inline">Business</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/business/login" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10">
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
          <Link href="/business/register" className="rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e54b00]">
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#111d3a]">
      <Image src={BANNER_IMAGE} alt="" fill priority className="object-cover opacity-40" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#111d3a] via-[#111d3a]/80 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 sm:pb-28 sm:pt-40">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-200">
          <Hotel className="h-4 w-4" /> MusafirBaba Business Partner Portal
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl">
          Grow your hotel business with <span className="text-[#FE5300]">MusafirBaba</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-200">List your hotel or resort, get verified once, and manage rooms, photos and your team from one place.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/business/register" className="inline-flex items-center gap-2 rounded-lg bg-[#FE5300] px-6 py-3 font-semibold text-white hover:bg-[#e54b00]">
            Register your property <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/business/login" className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h2 className="text-2xl font-bold text-slate-900">Who can join</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FE5300] text-white">
            <Hotel className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Hotels &amp; Resorts</h3>
          <p className="mt-2 text-sm text-slate-600">Hotels, resorts, homestays and other stays — one property or many, under one business.</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {["Room types with occupancy and beds", "Photo gallery for the property and each room", "Check-in times, policies and amenities", "Extra GST numbers for properties in other states"].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <b.icon className="h-6 w-6 text-[#FE5300]" />
              <p className="mt-3 font-semibold text-slate-900">{b.title}</p>
              <p className="mt-1 text-sm text-slate-600">{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-slate-200 p-5">
              <span className="absolute right-4 top-4 text-3xl font-bold text-slate-100">{i + 1}</span>
              <s.icon className="h-7 w-7 text-[#FE5300]" />
              <p className="mt-3 font-semibold text-slate-900">{s.title}</p>
              <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#111d3a] p-8 text-white md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold">Ready to list your property?</h2>
          <p className="mt-2 text-slate-300">
            Questions first? Write to{" "}
            <a href={`mailto:${SUPPORT.email}`} className="font-medium text-orange-300 hover:underline">
              {SUPPORT.email}
            </a>{" "}
            or call{" "}
            <a href={SUPPORT.phoneHref} className="font-medium text-orange-300">
              {SUPPORT.phone}
            </a>{" "}
            ({SUPPORT.hours}).
          </p>
        </div>
        <Link href="/business/register" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#FE5300] px-6 py-3 font-semibold hover:bg-[#e54b00]">
          Register now <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Hero />
      <Services />
      <HowItWorks />
      <Contact />
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © MusafirBaba · <Link href="/" className="hover:underline">musafirbaba.com</Link> · <a href={`mailto:${SUPPORT.email}`} className="hover:underline">{SUPPORT.email}</a>
      </footer>
    </div>
  );
}
