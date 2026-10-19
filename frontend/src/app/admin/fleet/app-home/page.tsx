"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Smartphone, ImagePlus, Megaphone, ArrowUp, ArrowDown, Pencil, Trash2, Plus, RotateCw, Upload } from "lucide-react";
import { FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetTone, FleetEmptyState, fleetTh, fleetSelectClass } from "@/components/admin/fleet/FleetUI";

// MBConnect (partner app) Home: carousel banners + "Important Update" announcements.
// Same flow as /admin/app-home (MBGO), on its own backend collections.

const BASE = process.env.NEXT_PUBLIC_BASE_URL;
const API = `${BASE}/admin/partner-app-home`;
const W = 1536;
const H = 1024;
const TARGET_BYTES = 220 * 1024;

type ActionType = "NONE" | "SCREEN" | "URL";
interface Banner {
  _id: string;
  title: string;
  image: { url: string; key?: string; width?: number; height?: number; size?: number };
  action: { type: ActionType; screen?: string | null; url?: string };
  order: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  live: boolean;
}
interface Announcement {
  _id: string;
  headline: string;
  message: string;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  sendPush: boolean;
  delivery?: { status: "PENDING" | "SENDING" | "SENT" | "FAILED"; notified?: number; pushed?: number; sentAt?: string; error?: string };
  live: boolean;
  createdAt: string;
}

const SCREENS = [
  ["WALLET", "Partner Wallet"],
  ["REFER_EARN", "Refer & Earn"],
  ["BOOKINGS", "Bookings"],
  ["EARNINGS", "Earnings"],
  ["DOCUMENTS", "Documents (KYC)"],
  ["VEHICLES", "Vehicles"],
  ["SUPPORT", "Help & Support"],
  ["INBOX", "Inbox"],
] as const;
const screenLabel = (s?: string | null) => SCREENS.find(([k]) => k === s)?.[1] || "-";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const toLocalInput = (d?: string | null) => {
  if (!d) return "";
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function windowState(x: { isActive: boolean; startAt?: string | null; endAt?: string | null; live: boolean }) {
  if (!x.isActive) return { label: "Off", tone: fleetTone.slate };
  if (x.live) return { label: "Live", tone: fleetTone.emerald };
  if (x.endAt && new Date(x.endAt) <= new Date()) return { label: "Ended", tone: fleetTone.slate };
  return { label: "Scheduled", tone: fleetTone.sky };
}

// Center-crops to 3:2, resizes to 1536x1024 and encodes WebP, lowering the
// quality until it's under ~220 KB.
async function makeBannerImage(file: File): Promise<{ blob: Blob; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read this image"));
      i.src = url;
    });
    if (img.naturalWidth < 1000 || img.naturalHeight < 666) throw new Error(`Image is too small (${img.naturalWidth}x${img.naturalHeight}). Use at least 1536x1024.`);
    const srcRatio = img.naturalWidth / img.naturalHeight;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (srcRatio > W / H) sw = sh * (W / H);
    else sh = sw / (W / H);
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    let blob: Blob | null = null;
    for (const q of [0.82, 0.74, 0.66, 0.58, 0.5]) {
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", q));
      if (!blob) throw new Error("This browser can't create WebP images");
      if (blob.type !== "image/webp") throw new Error("This browser can't create WebP images - use Chrome or Edge");
      if (blob.size <= TARGET_BYTES) break;
    }
    return { blob: blob!, preview: URL.createObjectURL(blob!) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PartnerAppHomePage() {
  const [tab, setTab] = useState<"banners" | "updates">("banners");
  return (
    <FleetPage>
      <FleetPageHeader
        icon={Smartphone}
        title="Connect App Home"
        description="Carousel banners and Important Updates shown on the MBConnect (partner) app's Home screen."
      />
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {([["banners", "Carousel banners"], ["updates", "Important updates"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-[13px] font-medium ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === "banners" ? <BannersTab /> : <UpdatesTab />}
    </FleetPage>
  );
}

function useApi() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  return async (path: string, method = "GET", body?: unknown) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || "Request failed");
    return json;
  };
}

// ---------------- Banners ----------------
const emptyBanner = { title: "", actionType: "NONE" as ActionType, screen: "WALLET", url: "", startAt: "", endAt: "", isActive: true };

function BannersTab() {
  const call = useApi();
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Banner[]>({ queryKey: ["partner-app-home-banners"], queryFn: async () => (await call("/banners")).data });
  const banners = data || [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(emptyBanner);
  const [image, setImage] = useState<{ blob?: Blob; preview: string; existing?: Banner["image"] } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["partner-app-home-banners"] });

  const openNew = () => {
    setEditing(null);
    setForm(emptyBanner);
    setImage(null);
    setOpen(true);
  };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({ title: b.title, actionType: b.action?.type || "NONE", screen: b.action?.screen || "WALLET", url: b.action?.url || "", startAt: toLocalInput(b.startAt), endAt: toLocalInput(b.endAt), isActive: b.isActive });
    setImage({ preview: b.image.url, existing: b.image });
    setOpen(true);
  };

  const pickFile = async (file?: File) => {
    if (!file) return;
    try {
      const out = await makeBannerImage(file);
      setImage(out);
      if (!form.title) setForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "").slice(0, 120) }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const uploadBlob = async (blob: Blob) => {
    const presign = await fetch(`${BASE}/upload/cloudflare-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ fileName: `partner-banner-${Date.now()}.webp`, fileType: "image/webp", folder: "partner-app-banners" }),
    });
    if (!presign.ok) throw new Error("Could not get an upload link");
    const { uploadUrl, fileUrl, key } = await presign.json();
    const put = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/webp" } });
    if (!put.ok) throw new Error("Image upload failed");
    return { url: fileUrl as string, key: key as string, width: W, height: H, size: blob.size };
  };

  const save = async () => {
    if (!image) return toast.error("Choose a banner image");
    setBusy(true);
    try {
      const img = image.blob ? await uploadBlob(image.blob) : image.existing;
      const body = {
        title: form.title,
        image: img,
        action: { type: form.actionType, screen: form.screen, url: form.url },
        startAt: fromLocalInput(form.startAt),
        endAt: fromLocalInput(form.endAt),
        isActive: form.isActive,
      };
      if (editing) await call(`/banners/${editing._id}`, "PATCH", body);
      else await call("/banners", "POST", body);
      toast.success(editing ? "Banner updated" : "Banner added");
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const ids = banners.map((b) => b._id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await call("/banners/reorder", "PUT", { ids });
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const toggle = async (b: Banner) => {
    try {
      await call(`/banners/${b._id}`, "PATCH", { isActive: !b.isActive });
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const remove = async (b: Banner) => {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    try {
      await call(`/banners/${b._id}`, "DELETE");
      toast.success("Banner deleted");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <FleetPanel
        title="Carousel banners"
        description={`Shown in this order on the MBConnect app's Home (up to 10 live). Images are resized to ${W}x${H} (3:2, same as the app's built-in banners) and compressed to WebP automatically.`}
        icon={ImagePlus}
        actions={<Button size="sm" onClick={openNew} className="bg-[#FE5300] hover:bg-[#e54b00]"><Plus size={14} /> Add banner</Button>}
      >
        {isLoading ? (
          <Loader />
        ) : !banners.length ? (
          <FleetEmptyState icon={ImagePlus} title="No banners yet" hint="When there are no live banners, the app shows its built-in banners." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={fleetTh}>Order</TableHead>
                <TableHead className={fleetTh}>Banner</TableHead>
                <TableHead className={fleetTh}>On tap</TableHead>
                <TableHead className={fleetTh}>Schedule</TableHead>
                <TableHead className={fleetTh}>Status</TableHead>
                <TableHead className={fleetTh} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((b, i) => {
                const st = windowState(b);
                return (
                  <TableRow key={b._id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === banners.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.image.url} alt={b.title} className="h-14 w-[84px] rounded-md object-cover ring-1 ring-slate-200" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-slate-900 truncate max-w-[220px]">{b.title}</div>
                          <div className="text-[11px] text-slate-500">{b.image.size ? `${Math.round(b.image.size / 1024)} KB` : ""}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-slate-600">
                      {b.action?.type === "SCREEN" ? `Opens ${screenLabel(b.action.screen)}` : b.action?.type === "URL" ? <span className="truncate max-w-[200px] inline-block align-bottom">{b.action.url}</span> : "Nothing"}
                    </TableCell>
                    <TableCell className="text-[12px] text-slate-600">
                      {b.startAt || b.endAt ? `${fmt(b.startAt) || "Now"} → ${fmt(b.endAt) || "No end"}` : "Always"}
                    </TableCell>
                    <TableCell><FleetPill className={st.tone}>{st.label}</FleetPill></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => toggle(b)}>{b.isActive ? "Turn off" : "Turn on"}</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => remove(b)}><Trash2 size={14} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </FleetPanel>

      <Sheet open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit banner" : "Add banner"}</SheetTitle>
            <SheetDescription>Upload any image - it's cropped to {W}x{H} (3:2) from the centre and compressed. Keep text away from the edges.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 hover:border-[#FE5300]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-[12px] text-slate-500"><Upload size={18} /> Choose image (PNG, JPG or WebP)</span>
              )}
            </button>
            {image?.blob && <p className="-mt-2 text-[11px] text-emerald-700">Ready: {W}x{H} WebP, {Math.round(image.blob.size / 1024)} KB</p>}
            {image && <Button variant="outline" size="sm" className="-mt-2 w-fit" onClick={() => fileRef.current?.click()}>Replace image</Button>}

            <label className="text-[12px] font-medium text-slate-700">Title (for admin and screen readers)
              <Input className="mt-1" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Founding Partners - Join now" />
            </label>

            <label className="text-[12px] font-medium text-slate-700">When tapped
              <select className={`${fleetSelectClass} mt-1 w-full`} value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value as ActionType })}>
                <option value="NONE">Do nothing</option>
                <option value="SCREEN">Open a screen in the app</option>
                <option value="URL">Open a web link</option>
              </select>
            </label>
            {form.actionType === "SCREEN" && (
              <label className="text-[12px] font-medium text-slate-700">Screen
                <select className={`${fleetSelectClass} mt-1 w-full`} value={form.screen} onChange={(e) => setForm({ ...form, screen: e.target.value })}>
                  {SCREENS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            )}
            {form.actionType === "URL" && (
              <label className="text-[12px] font-medium text-slate-700">Link
                <Input className="mt-1" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://musafirbaba.com/partner" />
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12px] font-medium text-slate-700">Start (optional)
                <Input type="datetime-local" className="mt-1" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              </label>
              <label className="text-[12px] font-medium text-slate-700">End (optional)
                <Input type="datetime-local" className="mt-1" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
            </label>
            <Button onClick={save} disabled={busy} className="bg-[#FE5300] hover:bg-[#e54b00]">{busy ? "Saving..." : editing ? "Save changes" : "Add banner"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------- Important updates ----------------
const emptyUpdate = { headline: "", message: "", startAt: "", endAt: "", sendPush: false, isActive: true };

function UpdatesTab() {
  const call = useApi();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Announcement[]>({
    queryKey: ["partner-app-home-updates"],
    queryFn: async () => (await call("/announcements")).data,
    refetchInterval: (q) => ((q.state.data as Announcement[] | undefined)?.some((a) => a.delivery?.status === "SENDING") ? 3000 : false),
  });
  const list = data || [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyUpdate);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["partner-app-home-updates"] });

  const openNew = () => {
    setEditing(null);
    setForm(emptyUpdate);
    setOpen(true);
  };
  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ headline: a.headline, message: a.message, startAt: toLocalInput(a.startAt), endAt: toLocalInput(a.endAt), sendPush: a.sendPush, isActive: a.isActive });
    setOpen(true);
  };
  const save = async () => {
    if (!editing && !confirm(form.sendPush ? "Publish this update and send a push notification to all partners?" : "Publish this update to all partners' Inbox?")) return;
    setBusy(true);
    try {
      const body = { headline: form.headline, message: form.message, startAt: fromLocalInput(form.startAt), endAt: fromLocalInput(form.endAt), isActive: form.isActive, ...(editing ? {} : { sendPush: form.sendPush }) };
      if (editing) await call(`/announcements/${editing._id}`, "PATCH", body);
      else await call("/announcements", "POST", body);
      toast.success(editing ? "Update saved" : "Update published");
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const delivery = (a: Announcement) => {
    const d = a.delivery;
    if (!d || d.status === "PENDING") return <span className="text-slate-500">Sends when it goes live</span>;
    if (d.status === "SENDING") return <span className="text-sky-700">Sending...</span>;
    if (d.status === "FAILED") return <span className="text-red-600">Failed ({d.notified || 0} sent)</span>;
    return <span className="text-slate-600">{d.notified || 0} partners{a.sendPush ? ` · ${d.pushed || 0} pushes` : ""}</span>;
  };

  return (
    <>
      <FleetPanel
        title="Important updates"
        description="The newest live update shows as one line on the MBConnect app's Home. Publishing also adds it to every partner's Inbox (once - editing never re-sends)."
        icon={Megaphone}
        actions={<Button size="sm" onClick={openNew} className="bg-[#FE5300] hover:bg-[#e54b00]"><Plus size={14} /> New update</Button>}
      >
        {isLoading ? (
          <Loader />
        ) : !list.length ? (
          <FleetEmptyState icon={Megaphone} title="No updates yet" hint="When there's no live update, the bar is hidden in the app." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={fleetTh}>Update</TableHead>
                <TableHead className={fleetTh}>Schedule</TableHead>
                <TableHead className={fleetTh}>Delivered</TableHead>
                <TableHead className={fleetTh}>Status</TableHead>
                <TableHead className={fleetTh} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => {
                const st = windowState(a);
                return (
                  <TableRow key={a._id}>
                    <TableCell className="max-w-[360px]">
                      <div className="text-[13px] font-medium text-slate-900 truncate">{a.headline}</div>
                      <div className="text-[12px] text-slate-500 truncate">{a.message}</div>
                    </TableCell>
                    <TableCell className="text-[12px] text-slate-600">{a.startAt || a.endAt ? `${fmt(a.startAt) || "Now"} → ${fmt(a.endAt) || "No end"}` : `From ${fmt(a.createdAt)}`}</TableCell>
                    <TableCell className="text-[12px]">{delivery(a)}</TableCell>
                    <TableCell><FleetPill className={st.tone}>{st.label}</FleetPill></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {a.delivery?.status === "FAILED" && (
                          <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => act(() => call(`/announcements/${a._id}/retry`, "POST"), "Retrying")}><RotateCw size={12} /> Retry</Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => act(() => call(`/announcements/${a._id}`, "PATCH", { isActive: !a.isActive }))}>{a.isActive ? "Hide" : "Show"}</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => confirm("Delete this update from the list? Partners who already received it keep it in their Inbox.") && act(() => call(`/announcements/${a._id}`, "DELETE"), "Update deleted")}><Trash2 size={14} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </FleetPanel>

      <Sheet open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit update" : "New important update"}</SheetTitle>
            <SheetDescription>{editing ? "Changes what Home shows. Partners who already received it are not notified again." : "Shown on Home and added to every partner's Inbox."}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6">
            <label className="text-[12px] font-medium text-slate-700">One-line headline (shown on Home)
              <Input className="mt-1" maxLength={90} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Airport rides are now open in Jaipur." />
              <span className="mt-1 block text-right text-[11px] text-slate-400">{form.headline.length}/90</span>
            </label>
            <label className="text-[12px] font-medium text-slate-700">Full message (shown in Inbox)
              <Textarea className="mt-1 min-h-[140px]" maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What changed, from when, and what drivers should do..." />
              <span className="mt-1 block text-right text-[11px] text-slate-400">{form.message.length}/1000</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12px] font-medium text-slate-700">Start (optional)
                <Input type="datetime-local" className="mt-1" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              </label>
              <label className="text-[12px] font-medium text-slate-700">End (optional)
                <Input type="datetime-local" className="mt-1" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
              </label>
            </div>
            {!editing && (
              <label className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-[13px] text-slate-700">
                <input type="checkbox" className="mt-0.5" checked={form.sendPush} onChange={(e) => setForm({ ...form, sendPush: e.target.checked })} />
                <span><b>Send push notification</b><br /><span className="text-[12px] text-slate-500">Phones buzz with the headline. Leave off for routine updates.</span></span>
              </label>
            )}
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Show on Home
            </label>
            <Button onClick={save} disabled={busy || !form.headline.trim() || !form.message.trim()} className="bg-[#FE5300] hover:bg-[#e54b00]">{busy ? "Saving..." : editing ? "Save changes" : "Publish update"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
