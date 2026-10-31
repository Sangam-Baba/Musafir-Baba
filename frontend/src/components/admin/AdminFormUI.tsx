"use client";

import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronRight, Pencil, Plus } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetPanel } from "@/components/admin/fleet/FleetUI";
import BlogEditor from "@/components/admin/BlogEditor";
import SmallEditor from "@/components/admin/SmallEditor";

// Presentational pieces for admin create/edit forms (visa, packages), built on
// the Fleet Management UI kit so every admin area looks the same. No form
// logic lives here.

export function AdminPageHeader({
  section,
  icon: Icon,
  title,
  description,
  badges,
  actions,
}: {
  section: string;
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <span>{section}</span>
          <ChevronRight size={12} className="text-slate-300" />
          <span className="text-slate-700">{title}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            <Icon size={18} className="text-[#FE5300]" />
            {title}
          </h1>
          {badges}
        </div>
        {description && <p className="mt-0.5 max-w-3xl text-[13px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface AdminFormTab {
  value: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

// Fleet-style tab bar; scrolls sideways on narrow screens instead of squashing
// labels. `gridClassName` is a literal like "lg:grid-cols-7" so Tailwind sees it.
export function AdminTabsList({ tabs, gridClassName }: { tabs: AdminFormTab[]; gridClassName: string }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <TabsList className={`inline-flex h-auto w-max min-w-full justify-start gap-0.5 rounded-md bg-slate-100/80 p-0.5 lg:grid lg:w-full ${gridClassName}`}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="h-8 gap-1.5 px-3 text-[12px] font-medium">
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

// The panel each admin tab's fields sit in.
export function AdminTabPanel({ tab, children }: { tab: AdminFormTab; children: React.ReactNode }) {
  return (
    <FleetPanel title={tab.title} description={tab.description} icon={tab.icon} bodyClassName="space-y-4 p-4">
      {children}
    </FleetPanel>
  );
}

// Sticky save bar at the bottom of the form.
export function AdminSaveBar({ hint, children }: { hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-1 flex flex-col gap-2 rounded-lg border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(16,24,40,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-slate-500">{hint}</p>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

// BlogEditor (fixed 600px) and SmallEditor (fixed 300px) are shared across the
// admin, so they're shortened from the outside, only where these wrappers are
// used: their root is the wrapper's direct child div, the toolbar its first child.
const COMPACT_BLOG_EDITOR =
  "[&>div]:h-[360px] [&>div]:shadow-none [&>div]:border-slate-200 [&>div>div:first-child]:bg-slate-50 [&>div>div:first-child]:border-slate-200";
const COMPACT_SMALL_EDITOR = "[&>div]:h-[200px] [&>div]:shadow-none";
const TALL_SMALL_EDITOR = "[&>div]:h-[320px] [&>div]:shadow-none";

export function CompactBlogEditor(props: React.ComponentProps<typeof BlogEditor>) {
  return (
    <div className={COMPACT_BLOG_EDITOR}>
      <BlogEditor {...props} />
    </div>
  );
}

// `tall` for editors holding a whole page section
export function CompactSmallEditor({ tall, ...props }: React.ComponentProps<typeof SmallEditor> & { tall?: boolean }) {
  return (
    <div className={tall ? TALL_SMALL_EDITOR : COMPACT_SMALL_EDITOR}>
      <SmallEditor {...props} />
    </div>
  );
}

const htmlToText = (html?: string) =>
  (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// Rich-text field shown as a compact preview card; the editor only opens on
// click. Same value/onChange contract as BlogEditor, so it drops into a
// FormField unchanged (extra props from FormControl land on the root div).
export function CollapsibleRichEditor({
  value,
  onChange,
  ...rest
}: { value?: string; onChange: (html: string) => void } & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">) {
  const [open, setOpen] = useState(false);
  const text = htmlToText(value);
  const preview = text || (/<img|<iframe|<video/i.test(value || "") ? "Media content" : "");

  return (
    <div {...rest} className="rounded-lg border border-slate-200/80 bg-white">
      {open ? (
        <div className="space-y-2 p-2">
          <CompactBlogEditor value={value || ""} onChange={onChange} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Check className="h-3.5 w-3.5" /> Done
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
        >
          <span className={`line-clamp-2 text-[12px] ${preview ? "text-slate-600" : "italic text-slate-400"}`}>
            {preview || "Nothing added yet"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#FE5300]">
            {preview ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {preview ? "Edit" : "Add"}
          </span>
        </button>
      )}
    </div>
  );
}
