"use client";

// Vehicle counterpart of VisaTabsEditor / PackageTabsEditor: reorder/hide
// built-in sections, override section headings, add custom rich-text tabs.
// Kept as its own component so the package and visa editors stay untouched.

import React, { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { FleetPill, fleetTone } from "@/components/admin/fleet/FleetUI";
import BlogEditor from "@/components/admin/BlogEditor";
import SmallEditor from "@/components/admin/SmallEditor";
import {
  VehicleTabConfigItem,
  VehicleBuiltinTabKey,
  DEFAULT_VEHICLE_TABS_CONFIG,
  VEHICLE_DEFAULT_SECTION_TITLE,
  VEHICLE_BUILTIN_RICH_TEXT_FIELD,
  VEHICLE_BUILTIN_EDIT_NOTE,
  getVehicleTabDisplayLabel,
  makeVehicleCustomTabKey,
} from "@/lib/vehicleTabs";

interface RowProps {
  entry: VehicleTabConfigItem;
  onChange: (patch: Partial<VehicleTabConfigItem>) => void;
  onRemove?: () => void;
  body?: React.ReactNode;
  note?: string;
  hasError?: boolean;
}

function SortableVehicleTabRow({ entry, onChange, onRemove, body, note, hasError }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  // Open the row when its content fails validation, so the message is visible
  useEffect(() => {
    if (hasError) setExpanded(true);
  }, [hasError]);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCustom = entry.type === "custom";
  const defaultTitle = !isCustom && entry.builtinKey ? VEHICLE_DEFAULT_SECTION_TITLE[entry.builtinKey] : undefined;
  const hasTitleField = isCustom || !!defaultTitle;

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

        <div className={`flex-1 min-w-0 grid grid-cols-1 gap-1.5 ${hasTitleField ? "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""}`}>
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
                <span className="truncate">{getVehicleTabDisplayLabel(entry)}</span>
              </div>
            )}
          </label>
          {hasTitleField && (
            <label className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-500">Section title (heading on page)</span>
              <Input
                className="h-8 text-[13px] px-2.5 rounded-md"
                value={entry.sectionTitle ?? ""}
                onChange={(e) => onChange({ sectionTitle: e.target.value })}
                placeholder={isCustom ? (entry.label ? `Defaults to "${entry.label}"` : "Heading shown above the content") : `Defaults to "${defaultTitle}"`}
              />
            </label>
          )}
        </div>

        <span className="hidden shrink-0 sm:inline-flex">
          <FleetPill className={hasError ? fleetTone.red : entry.hidden ? fleetTone.amber : isCustom ? fleetTone.violet : fleetTone.slate}>
            {hasError ? "Fix errors" : entry.hidden ? "Hidden" : isCustom ? "Custom" : "Built-in"}
          </FleetPill>
        </span>

        <button
          type="button"
          onClick={() => onChange({ hidden: !entry.hidden })}
          title={entry.hidden ? "Hidden — click to show" : "Visible — click to hide"}
          className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${entry.hidden ? "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"}`}
        >
          {entry.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>

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

      {!body && note && <p className="px-3 pb-2 -mt-1 text-[11px] text-slate-400 italic">{note}</p>}
      {expanded && body && <div className="border-t border-slate-100 bg-slate-50/40 p-3 rounded-b-lg">{body}</div>}
    </div>
  );
}

export default function VehicleTabsEditor({
  value,
  onChange,
  form,
  builtinBodies,
  errorKeys,
}: {
  value: VehicleTabConfigItem[];
  onChange: (next: VehicleTabConfigItem[]) => void;
  // The vehicle form's react-hook-form instance; built-in rich-text bodies
  // read and write the vehicle's own fields.
  form: any;
  // Structured built-ins (features, inclusions, FAQs, resources): the form
  // passes its editors for those fields, rendered inside their rows.
  builtinBodies?: Partial<Record<VehicleBuiltinTabKey, React.ReactNode>>;
  // Rows whose content currently has validation errors (auto-expanded)
  errorKeys?: Partial<Record<VehicleBuiltinTabKey, boolean>>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const update = (key: string, patch: Partial<VehicleTabConfigItem>) => {
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
          Drag to reorder how sections appear on the vehicle page. Any section can be hidden; sections with no content
          are not shown as tabs. Section title overrides the heading; leave it empty to keep the usual heading. Expand
          any tab (arrow on the right) to edit its content; this is the only place each section&apos;s content is edited.
          Custom tabs have their own name and rich-text content. Vehicle at a Glance and Quick Answers (above the tabs)
          are in the Additional tab.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[11px] shrink-0"
          onClick={() => {
            if (window.confirm("Reset tabs to the default order? Custom tabs will be removed.")) {
              onChange(DEFAULT_VEHICLE_TABS_CONFIG.map((e) => ({ ...e })));
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
              let note: string | undefined;

              if (entry.type === "custom") {
                body = (
                  <div className="border rounded-lg overflow-hidden min-h-[200px] bg-white">
                    <BlogEditor value={entry.content || ""} onChange={(content: string) => update(entry.key, { content })} />
                  </div>
                );
              } else if (entry.builtinKey) {
                const field = VEHICLE_BUILTIN_RICH_TEXT_FIELD[entry.builtinKey as VehicleBuiltinTabKey];
                if (field) {
                  const current = form.watch(field);
                  const html = typeof current === "string" ? current : "";
                  const setHtml = (val: string) => form.setValue(field, val, { shouldDirty: true });
                  body = (
                    <div className="border rounded-lg overflow-hidden min-h-[200px] bg-white">
                      {field === "content" ? (
                        <BlogEditor value={html} onChange={setHtml} />
                      ) : (
                        <SmallEditor value={html} onChange={setHtml} />
                      )}
                    </div>
                  );
                } else {
                  body = builtinBodies?.[entry.builtinKey as VehicleBuiltinTabKey];
                  if (!body) note = VEHICLE_BUILTIN_EDIT_NOTE[entry.builtinKey as VehicleBuiltinTabKey];
                }
              }

              return (
                <SortableVehicleTabRow
                  key={entry.key}
                  entry={entry}
                  onChange={(patch) => update(entry.key, patch)}
                  onRemove={entry.type === "custom" ? () => onChange(value.filter((e) => e.key !== entry.key)) : undefined}
                  body={body}
                  note={note}
                  hasError={entry.type === "builtin" && !!errorKeys?.[entry.builtinKey as VehicleBuiltinTabKey]}
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
        onClick={() => onChange([...value, { key: makeVehicleCustomTabKey(), label: "New Tab", type: "custom", content: "" }])}
      >
        + Add Custom Tab
      </Button>
    </div>
  );
}
