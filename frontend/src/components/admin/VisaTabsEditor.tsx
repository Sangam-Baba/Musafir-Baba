"use client";

// Visa counterpart of PackageTabsEditor: reorder/hide built-in tabs, override
// section headings, add custom rich-text tabs. Kept as its own component so
// the package editor stays untouched.

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FleetPill, fleetTone } from "@/components/admin/fleet/FleetUI";
import { Input } from "@/components/ui/input";
import { VisaBlogEditor, VisaSmallEditor } from "@/components/admin/visa/VisaAdminUI";
import {
  VisaTabConfigItem,
  VisaBuiltinTabKey,
  DEFAULT_VISA_TABS_CONFIG,
  VISA_ALWAYS_VISIBLE_BUILTIN_KEYS,
  VISA_BUILTIN_RICH_TEXT_FIELD,
  getVisaTabDisplayLabel,
  getVisaDefaultSectionTitle,
  makeVisaCustomTabKey,
} from "@/lib/visaTabs";

// Same editor each field uses in its original admin tab
const SMALL_EDITOR_FIELDS = new Set(["documentsContent", "process"]);

interface RowProps {
  entry: VisaTabConfigItem;
  country?: string;
  onChange: (patch: Partial<VisaTabConfigItem>) => void;
  onRemove?: () => void;
  body?: React.ReactNode;
  note?: string;
}

function SortableVisaTabRow({ entry, country, onChange, onRemove, body, note }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCustom = entry.type === "custom";
  const isAlwaysVisible = !isCustom && VISA_ALWAYS_VISIBLE_BUILTIN_KEYS.has(entry.builtinKey as VisaBuiltinTabKey);
  const defaultTitle = !isCustom && entry.builtinKey ? getVisaDefaultSectionTitle(entry.builtinKey, country) : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors ${expanded ? "border-orange-200" : "border-slate-200/80 hover:border-slate-300"} ${entry.hidden ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 grid grid-cols-1 gap-1.5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <label className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-slate-500">Tab name</span>
            {isCustom ? (
              <Input
                className="h-8 text-[13px] px-2.5 rounded-md"
                value={entry.label}
                onChange={(e) => onChange({ label: e.target.value })}
                placeholder="Short name on the tab pill"
              />
            ) : (
              <div className="h-8 flex items-center px-0.5 text-[13px] font-semibold text-slate-800 truncate" title="Built-in tab name (not editable)">
                <span className="truncate">{getVisaTabDisplayLabel(entry, country)}</span>
              </div>
            )}
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-slate-500">Section title (H2 on page)</span>
            <Input
              className="h-8 text-[13px] px-2.5 rounded-md"
              value={entry.sectionTitle ?? ""}
              onChange={(e) => onChange({ sectionTitle: e.target.value })}
              placeholder={isCustom ? (entry.label ? `Defaults to "${entry.label}"` : "Heading shown above the content") : `Defaults to "${defaultTitle}"`}
            />
          </label>
        </div>

        <span className="hidden shrink-0 sm:inline-flex">
          <FleetPill className={entry.hidden ? fleetTone.amber : isCustom ? fleetTone.violet : fleetTone.slate}>
            {entry.hidden ? "Hidden" : isCustom ? "Custom" : "Built-in"}
          </FleetPill>
        </span>

        {!isAlwaysVisible && (
          <button
            type="button"
            onClick={() => onChange({ hidden: !entry.hidden })}
            title={entry.hidden ? "Hidden — click to show" : "Visible — click to hide"}
            className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${entry.hidden ? "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"}`}
          >
            {entry.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}

        {body && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${expanded ? "bg-orange-50 text-[#FE5300] border-orange-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
            title="Edit content"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        {isCustom && onRemove && (
          <Button type="button" variant="destructive" size="sm" className="h-8 w-8 p-0 shrink-0 rounded-md" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {!body && note && <p className="px-2 pb-2 text-[10px] text-gray-400 italic">{note}</p>}
      {expanded && body && <div className="border-t border-slate-100 bg-slate-50/40 p-3 rounded-b-lg">{body}</div>}
    </div>
  );
}

export default function VisaTabsEditor({
  value,
  onChange,
  form,
  country,
  builtinBodies,
}: {
  value: VisaTabConfigItem[];
  onChange: (next: VisaTabConfigItem[]) => void;
  // The visa page's react-hook-form instance; built-in rich-text bodies read
  // and write the same fields their original admin tabs use.
  form: any;
  country?: string;
  // Structured built-ins (visa cards, FAQs, gallery...): the page passes the
  // exact editor it renders in that field's own tab, so both are one editor.
  builtinBodies?: Partial<Record<VisaBuiltinTabKey, React.ReactNode>>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const update = (key: string, patch: Partial<VisaTabConfigItem>) => {
    onChange(value.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((e) => e.key === active.id);
    const newIndex = value.findIndex((e) => e.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[11px] text-gray-500 leading-relaxed max-w-3xl">
          Drag to reorder how tabs appear on the visa page. Built-in tabs can be hidden (Visa Types can&apos;t, it holds the
          pricing); any tab with no content is not shown at all. Section title overrides the H2 heading; leave it empty to keep
          the usual heading. Expand any tab (arrow on the right) to edit its content; this is the only place each tab&apos;s
          content is edited. Custom tabs have their own name and rich-text content.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[11px] shrink-0"
          onClick={() => {
            if (window.confirm("Reset tabs to the default order? Custom tabs will be removed.")) {
              onChange(DEFAULT_VISA_TABS_CONFIG.map((e) => ({ ...e })));
            }
          }}
        >
          <RotateCcw className="w-3 h-3 mr-1" /> Reset to default
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((e) => e.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {value.map((entry) => {
              let body: React.ReactNode | undefined;

              if (entry.type === "custom") {
                body = <VisaBlogEditor value={entry.content || ""} onChange={(content: string) => update(entry.key, { content })} />;
              } else if (entry.builtinKey) {
                const field = VISA_BUILTIN_RICH_TEXT_FIELD[entry.builtinKey];
                if (field) {
                  const current = form.watch(field);
                  const html = typeof current === "string" ? current : "";
                  const setHtml = (val: string) => form.setValue(field, val, { shouldDirty: true });
                  body = SMALL_EDITOR_FIELDS.has(field) ? (
                    <div className="text-xs">
                      <VisaSmallEditor tall value={html} onChange={setHtml} />
                    </div>
                  ) : (
                    <VisaBlogEditor value={html} onChange={setHtml} />
                  );
                } else {
                  body = builtinBodies?.[entry.builtinKey];
                }
              }

              return (
                <SortableVisaTabRow
                  key={entry.key}
                  entry={entry}
                  country={country}
                  onChange={(patch) => update(entry.key, patch)}
                  onRemove={entry.type === "custom" ? () => onChange(value.filter((e) => e.key !== entry.key)) : undefined}
                  body={body}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        size="sm"
        className="h-7 text-[11px]"
        onClick={() => onChange([...value, { key: makeVisaCustomTabKey(), label: "New Tab", type: "custom", content: "" }])}
      >
        + Add Custom Tab
      </Button>
    </div>
  );
}
