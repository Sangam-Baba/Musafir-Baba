"use client";
// Client voucher branding (Stage 15): the name, contact, colour and logo link printed on the voucher your guest gets
// for bookings made through your company — never a price or MusafirBaba's margin. Nothing saved → your company name.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, Panel } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import type { Branding } from "@/b2b/payouts";

const HEX = /^#[0-9a-fA-F]{6}$/;
const LOGO = /^https:\/\/[^\s"'<>()\\]+\.(png|jpe?g|webp|svg)(\?[^\s"'<>()\\]*)?$/i;

function BrandingView({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["b2b", "branding"], queryFn: () => b2b<{ data: Branding | null }>("/branding") });
  const saved = q.data?.data ?? null;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [colour, setColour] = useState("");
  const [logo, setLogo] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!saved) return;
    setName(saved.name);
    setPhone(saved.contactPhone ?? "");
    setEmail(saved.contactEmail ?? "");
    setColour(saved.colour ?? "");
    setLogo(saved.logoUrl ?? "");
  }, [saved]);
  const problems = [
    name.trim().length < 2 && "Name: at least 2 characters",
    colour && !HEX.test(colour) && "Colour: like #0A6E5C",
    logo && !LOGO.test(logo) && "Logo: an https:// link to a .png, .jpg, .webp or .svg image",
  ].filter(Boolean) as string[];
  async function save() {
    setBusy(true);
    try {
      await b2b("/branding", {
        method: "PUT",
        body: { name: name.trim(), contactPhone: phone.trim() || null, contactEmail: email.trim() || null, colour: colour || null, logoUrl: logo.trim() || null, expectedVersion: saved?.version ?? 0 },
      });
      toast.success("Saved — new vouchers use it");
      void qc.invalidateQueries({ queryKey: ["b2b", "branding"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const input = "h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px] disabled:bg-slate-50";
  return (
    <div className="space-y-4">
      <PageHeader title="Voucher" highlight="branding" subtitle="Your guests get a voucher with your name instead of MusafirBaba's. It never shows a price." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Palette} title="Your brand">
          {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
          <div className="space-y-3 text-[13px]">
            <label className="block">Name on the voucher<input disabled={!canEdit} className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Trips Co Travels" /></label>
            <label className="block">Contact phone (optional)<input disabled={!canEdit} className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98100 00000" /></label>
            <label className="block">Contact email (optional)<input disabled={!canEdit} className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="help@yourcompany.com" /></label>
            <label className="block">Colour (optional)
              <span className="flex items-center gap-2">
                <input disabled={!canEdit} type="color" value={HEX.test(colour) ? colour : "#0f172a"} onChange={(e) => setColour(e.target.value)} className="h-9 w-12 rounded border border-slate-200" />
                <input disabled={!canEdit} className={input} value={colour} onChange={(e) => setColour(e.target.value)} placeholder="#0A6E5C" />
              </span>
            </label>
            <label className="block">Logo link (optional)<input disabled={!canEdit} className={input} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://yourcompany.com/logo.png" /></label>
            {problems.map((p) => <p key={p} className="text-[12px] text-red-700">{p}</p>)}
            {canEdit ? (
              <button disabled={busy || problems.length > 0} onClick={save} className="rounded-lg bg-[#FE5300] px-4 py-2 font-medium text-white disabled:opacity-50">Save</button>
            ) : (
              <p className="text-[12px] text-slate-500">Only people who can edit the business profile can change this.</p>
            )}
          </div>
        </Panel>
        <Panel title="Preview" subtitle="The top of the voucher your guest sees">
          <div className="rounded-lg border border-slate-200 p-4">
            {LOGO.test(logo) && (
              // eslint-disable-next-line @next/next/no-img-element -- a client's own logo link, shown as the voucher shows it
              <img src={logo} alt="" className="mb-1 max-h-12 max-w-[180px]" />
            )}
            <p className="text-lg font-bold" style={HEX.test(colour) ? { color: colour } : undefined}>{name.trim() || "Your company name"}</p>
            <p className="mt-2 text-[13px] text-slate-600">Hotel voucher · Booking MBO-XXXXXXXX</p>
            <p className="mt-4 text-[12px] text-slate-500">Booked through {name.trim() || "your company"} — contact them for any help with this booking{[phone.trim(), email.trim()].filter(Boolean).length ? `: ${[phone.trim(), email.trim()].filter(Boolean).join(" · ")}` : "."}</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default function BrandingPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("orders.order.read") ? (
          <BrandingView canEdit={me.permissions.includes("organizations.org.update")} />
        ) : (
          <p className="text-[13px] text-slate-600">Voucher branding is for B2B client companies.</p>
        )
      }
    </BusinessShell>
  );
}
