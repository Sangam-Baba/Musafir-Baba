"use client";
// B2B admin (MusafirBaba staff): organisations, business users and the activity log.
// Lives inside the existing admin panel and its login; nothing existing is changed.
import { useState } from "react";

import { AdminPassGate } from "@/b2b/components/admin/AdminPassGate";
import { OrgsTab } from "@/b2b/components/admin/OrgsTab";
import { ActivityTab, UsersTab } from "@/b2b/components/admin/UsersAndActivity";

const TABS = [
  { key: "orgs", label: "Organisations" },
  { key: "users", label: "Users" },
  { key: "activity", label: "Activity" },
] as const;

export default function B2BAdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("orgs");
  return (
    <AdminPassGate>
      {(token) => (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">B2B &amp; hotels</h1>
            <p className="text-sm text-slate-500">Client and hotel organisations, their users and activity.</p>
          </div>
          <div className="flex gap-1 border-b border-slate-200">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.key ? "border-[#FE5300] font-medium text-[#FE5300]" : "border-transparent text-slate-600"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === "orgs" && <OrgsTab token={token} />}
          {tab === "users" && <UsersTab token={token} />}
          {tab === "activity" && <ActivityTab token={token} />}
        </div>
      )}
    </AdminPassGate>
  );
}
