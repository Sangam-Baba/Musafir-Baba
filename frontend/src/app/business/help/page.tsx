"use client";
// Help & Support: how to reach MusafirBaba's partner team, and answers to the questions partners ask most.
import { Clock, Mail, Phone } from "lucide-react";

import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, Panel } from "@/b2b/components/portal/ui";
import { SUPPORT } from "@/b2b/support";

const FAQ = [
  ["How long does verification take?", "Usually 1–2 working days after you submit. You get an email and a notification in the bell when it's decided."],
  ["My verification needs changes — what now?", "Open Verification: each problem is listed next to its document. Upload a new file, then press “Submit again”."],
  ["When can I list my property?", "You can prepare it any time under My Properties. It can be submitted once your business is verified."],
  ["Why does a change to my live listing wait?", "Changes to the name, star rating, location, check-in time or time zone are checked by MusafirBaba first. Your listing stays live with the current details meanwhile."],
  ["Can I give my staff access?", "Yes — invite them under Team & Access and choose a role. Managers can be limited to some properties."],
];

export default function HelpPage() {
  return (
    <BusinessShell>
      {() => (
        <div className="space-y-6">
          <PageHeader crumb="Help & Support" title="Help &" highlight="Support" subtitle="We're here to help with onboarding, verification and your listings." />
          <div className="grid gap-4 md:grid-cols-3">
            <a href={`mailto:${SUPPORT.email}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 hover:shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FE5300]">
                <Mail className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-sm text-slate-500">Email us</span>
                <span className="block font-semibold text-slate-900">{SUPPORT.email}</span>
              </span>
            </a>
            <a href={SUPPORT.phoneHref} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 hover:shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Phone className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-sm text-slate-500">Call us</span>
                <span className="block font-semibold text-slate-900">{SUPPORT.phone}</span>
              </span>
            </a>
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Clock className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-sm text-slate-500">Support hours</span>
                <span className="block font-semibold text-slate-900">{SUPPORT.hours}</span>
              </span>
            </div>
          </div>
          <Panel title="Frequently asked questions">
            <div className="divide-y divide-slate-100">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-3">
                  <summary className="cursor-pointer list-none font-medium text-slate-900 group-open:text-[#FE5300]">{q}</summary>
                  <p className="mt-2 text-sm text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </BusinessShell>
  );
}
