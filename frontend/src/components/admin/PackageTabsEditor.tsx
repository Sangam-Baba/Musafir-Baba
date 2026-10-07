"use client";

import React, { useState } from "react";
import { useFieldArray } from "react-hook-form";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormLabel } from "@/components/ui/form";
import BlogEditor from "@/components/admin/BlogEditor";
import SmallEditor from "@/components/admin/SmallEditor";
import ImageUploader from "@/components/admin/ImageUploader";
import {
  TabConfigItem,
  ALWAYS_VISIBLE_BUILTIN_KEYS,
  BUILTIN_RICH_TEXT_FIELD,
  makeCustomTabKey,
} from "@/lib/packageTabs";

interface SortableRowProps {
  entry: TabConfigItem;
  onLabelChange: (label: string) => void;
  onToggleHidden: () => void;
  onRemove?: () => void;
  // Either a simple rich-text field (BlogEditor) or a fully custom body
  // (the array-based editors below) — a row only ever uses one of the two.
  onContentChange?: (html: string) => void;
  customBody?: React.ReactNode;
  staticNote?: string;
}

function SortableTabRow({ entry, onLabelChange, onToggleHidden, onRemove, onContentChange, customBody, staticNote }: SortableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isAlwaysVisible = entry.type === "builtin" && ALWAYS_VISIBLE_BUILTIN_KEYS.has(entry.builtinKey as any);
  const canExpand = !!onContentChange || !!customBody;

  return (
    <div ref={setNodeRef} style={style} className="bg-white border rounded-md">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <Input
          className="h-7 text-xs px-2 rounded-sm flex-1"
          value={entry.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Tab label"
        />

        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 shrink-0 px-1.5">
          {entry.type === "custom" ? "Custom" : "Built-in"}
        </span>

        {!isAlwaysVisible && (
          <button
            type="button"
            onClick={onToggleHidden}
            title={entry.hidden ? "Hidden — click to show" : "Visible — click to hide"}
            className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-sm border ${entry.hidden ? "bg-gray-50 text-gray-400 border-gray-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}
          >
            {entry.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}

        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-sm border bg-gray-50 text-gray-500 border-gray-200"
            title="Edit content"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        {entry.type === "custom" && onRemove && (
          <Button type="button" variant="destructive" size="sm" className="h-7 px-2 shrink-0" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {!canExpand && staticNote && (
        <p className="px-2 pb-2 text-[10px] text-gray-400 italic">{staticNote}</p>
      )}

      {expanded && onContentChange && (
        <div className="px-2 pb-2">
          <BlogEditor value={entry.content || ""} onChange={onContentChange} />
        </div>
      )}

      {expanded && customBody && <div className="px-2 pb-2">{customBody}</div>}
    </div>
  );
}

export default function PackageTabsEditor({
  value,
  onChange,
  form,
}: {
  value: TabConfigItem[];
  onChange: (next: TabConfigItem[]) => void;
  // `any` on purpose: this is the page's own react-hook-form instance. Its
  // real type is UseFormReturn<PackageFormValues>, whose fields require
  // that exact generic's literal path union — giving this prop any
  // narrower structural type here still doesn't match it (TS keeps that
  // union invariant), so this is the same pragmatic escape hatch already
  // used to keep tabsConfig out of react-hook-form entirely.
  form: any;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Reusing the exact same field arrays the Content/FAQs & Review tabs use
  // (same `form`, same field names) — this is a second access point onto
  // the same data, not a separate copy of it, so edits here and edits in
  // those original tabs stay perfectly in sync automatically.
  const itineraryArray = useFieldArray({ control: form.control, name: "itinerary" });
  const inclusionsArray = useFieldArray({ control: form.control, name: "inclusions" });
  const exclusionsArray = useFieldArray({ control: form.control, name: "exclusions" });
  const faqsArray = useFieldArray({ control: form.control, name: "faqs" });
  const helpfulResourcesArray = useFieldArray({ control: form.control, name: "helpfulResources" });

  const update = (key: string, patch: Partial<TabConfigItem>) => {
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

  const addCustomTab = () => {
    onChange([
      ...value,
      { key: makeCustomTabKey(), label: "New Tab", type: "custom", content: "" },
    ]);
  };

  const removeCustomTab = (key: string) => {
    onChange(value.filter((e) => e.key !== key));
  };

  const itineraryBody = (
    <div className="space-y-2">
      {itineraryArray.fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 border rounded-md">
          <div className="flex flex-col gap-2">
            <Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`itinerary.${index}.title` as const)} placeholder="Day Title" />
            <Textarea className="text-xs p-2 min-h-[60px]" {...form.register(`itinerary.${index}.description` as const)} placeholder="Day Description" />
            <Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`itinerary.${index}.tip` as const)} placeholder="Day Tip (Optional)" />
          </div>
          <div className="flex flex-col gap-2 justify-between">
            <div>
              <FormLabel className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Location Image (Optional)</FormLabel>
              <ImageUploader
                initialImage={form.watch(`itinerary.${index}.locationImage`)}
                onUpload={(img: any) => {
                  if (!img) return;
                  form.setValue(`itinerary.${index}.locationImage`, { url: img.url, public_id: img.public_id, alt: img.alt ?? "Itinerary Image" });
                }}
              />
            </div>
            <Button type="button" variant="destructive" size="sm" className="self-end h-7 text-[10px] w-full mt-2" onClick={() => itineraryArray.remove(index)}>
              Remove Step
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => itineraryArray.append({ title: "", description: "" })}>
        Add Itinerary Step
      </Button>
    </div>
  );

  const inclusionsExclusionsBody = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <FormLabel className="text-[10px] font-bold text-gray-500 uppercase">Inclusions</FormLabel>
        {inclusionsArray.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`inclusions.${index}` as const)} placeholder="Enter inclusion" />
            <Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => inclusionsArray.remove(index)}>Remove</Button>
          </div>
        ))}
        <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => inclusionsArray.append("")}>Add Inclusion</Button>
      </div>
      <div className="space-y-2">
        <FormLabel className="text-[10px] font-bold text-gray-500 uppercase">Exclusions</FormLabel>
        {exclusionsArray.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`exclusions.${index}` as const)} placeholder="Enter exclusion" />
            <Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => exclusionsArray.remove(index)}>Remove</Button>
          </div>
        ))}
        <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => exclusionsArray.append("")}>Add Exclusion</Button>
      </div>
    </div>
  );

  const faqsBody = (
    <div className="space-y-2">
      {faqsArray.fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <div className="grid gap-2 flex-1 border border-gray-100 p-2 rounded bg-gray-50">
            <Input className="h-7 text-xs px-2 rounded-sm bg-white" {...form.register(`faqs.${index}.question` as const)} placeholder="Question" />
            <div className="border border-gray-200 rounded p-2 bg-white">
              <SmallEditor value={form.getValues(`faqs.${index}.answer`)} onChange={(val: string) => form.setValue(`faqs.${index}.answer`, val)} />
            </div>
          </div>
          <Button type="button" variant="destructive" size="sm" className="h-7 px-2 mt-2" onClick={() => faqsArray.remove(index)}>X</Button>
        </div>
      ))}
      <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => faqsArray.append({ question: "", answer: "" })}>Add FAQ</Button>
    </div>
  );

  const resourcesBody = (
    <div className="space-y-2">
      {helpfulResourcesArray.fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input className="h-7 text-xs px-2 rounded-sm flex-1" {...form.register(`helpfulResources.${index}.title` as const)} placeholder="Resource Title" />
          <Input className="h-7 text-xs px-2 rounded-sm flex-1" {...form.register(`helpfulResources.${index}.url` as const)} placeholder="Resource URL" />
          <Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => helpfulResourcesArray.remove(index)}>X</Button>
        </div>
      ))}
      <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => helpfulResourcesArray.append({ title: "", url: "" })}>+ Add Resource</Button>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Drag to reorder how tabs appear on the package page. Built-in tabs can be hidden (if content is empty
        they're hidden automatically regardless of this toggle) or renamed; Overview, Itinerary and Inclusions
        are always shown since they hold required content. Every built-in tab's content can be edited right here —
        it's the exact same data as the Content/FAQs & Review tabs, just a second way in. Add fully custom tabs
        with their own rich-text content.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((e) => e.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {value.map((entry) => {
              const richTextField = entry.type === "builtin" && entry.builtinKey ? BUILTIN_RICH_TEXT_FIELD[entry.builtinKey] : undefined;
              const rowEntry = richTextField ? { ...entry, content: form.watch(richTextField) || "" } : entry;

              let onContentChange: ((content: string) => void) | undefined;
              let customBody: React.ReactNode | undefined;
              let staticNote: string | undefined;

              if (entry.type === "custom") {
                onContentChange = (content) => update(entry.key, { content });
              } else if (richTextField) {
                onContentChange = (content) => form.setValue(richTextField, content);
              } else {
                switch (entry.builtinKey) {
                  case "itineraries":
                    customBody = itineraryBody;
                    break;
                  case "includeexclude":
                    customBody = inclusionsExclusionsBody;
                    break;
                  case "faqs":
                    customBody = faqsBody;
                    break;
                  case "helpfulresources":
                    customBody = resourcesBody;
                    break;
                  case "whychoosemusafirbaba":
                    // Genuinely not package data — a fixed, site-wide block
                    // shared by every package page (see WhyChoose.tsx).
                    // There's nothing here to edit without a separate,
                    // larger change to make that section itself dynamic.
                    staticNote = "Fixed, site-wide block shown on every package — not package-specific content.";
                    break;
                }
              }

              return (
                <SortableTabRow
                  key={entry.key}
                  entry={rowEntry}
                  onLabelChange={(label) => update(entry.key, { label })}
                  onToggleHidden={() => update(entry.key, { hidden: !entry.hidden })}
                  onRemove={entry.type === "custom" ? () => removeCustomTab(entry.key) : undefined}
                  onContentChange={onContentChange}
                  customBody={customBody}
                  staticNote={staticNote}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" size="sm" className="h-7 text-[11px]" onClick={addCustomTab}>
        + Add Custom Tab
      </Button>
    </div>
  );
}
