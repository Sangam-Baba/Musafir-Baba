"use client";

import React from "react";
import { useFieldArray, type UseFormReturn, type FieldValues } from "react-hook-form";
import { ChevronDown, ChevronUp, ImagePlus, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageUploader from "@/components/admin/ImageUploader";

// Hotel cards for a package's "Hotels" section (field `accommodationHotels`):
// name, star rating, location, short description and several images per
// hotel. No price. Shown on the package page after the Hotels text.

export interface PackageHotelImage {
  url: string;
  public_id?: string;
  alt?: string;
}

export interface PackageHotel {
  name: string;
  stars?: number;
  location?: string;
  description?: string;
  images: PackageHotelImage[];
}

const EMPTY_HOTEL: PackageHotel = { name: "", stars: 3, location: "", description: "", images: [] };

const label = "text-[10px] font-bold text-gray-500 uppercase block mb-1";
const input =
  "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-[#FE5300] focus:outline-none focus:ring-2 focus:ring-orange-500/10";

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(value === n ? 0 : n)}
          className="p-0.5"
        >
          <Star className={`h-5 w-5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
      <span className="ml-1.5 text-[11px] text-gray-500">{value ? `${value}-star` : "No rating"}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the package page's own form (see PackageTabsEditor)
export default function PackageHotelsEditor({ form }: { form: UseFormReturn<FieldValues> | any }) {
  const hotels = useFieldArray({ control: form.control, name: "accommodationHotels" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={label}>Hotels ({hotels.fields.length}) — shown as cards, no prices</span>
      </div>

      {hotels.fields.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-[12px] text-gray-500">
          No hotels yet. Add the hotels guests stay in — name, stars, location, a short note and photos.
        </p>
      )}

      {hotels.fields.map((field, index) => {
        const base = `accommodationHotels.${index}`;
        const images: PackageHotelImage[] = form.watch(`${base}.images`) || [];
        const stars = Number(form.watch(`${base}.stars`) || 0);
        return (
          <div key={field.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-gray-700">
                Hotel {index + 1}
                {form.watch(`${base}.name`) ? ` — ${form.watch(`${base}.name`)}` : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => hotels.move(index, index - 1)} aria-label="Move up">
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === hotels.fields.length - 1} onClick={() => hotels.move(index, index + 1)} aria-label="Move down">
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => hotels.remove(index)} aria-label="Remove hotel">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <span className={label}>Hotel name *</span>
                <input {...form.register(`${base}.name`)} placeholder="e.g. Hotel Himalayan Retreat" className={input} />
              </div>
              <div>
                <span className={label}>Location</span>
                <input {...form.register(`${base}.location`)} placeholder="e.g. Mall Road, Manali" className={input} />
              </div>
            </div>

            <div>
              <span className={label}>Star rating</span>
              <StarPicker value={stars} onChange={(n) => form.setValue(`${base}.stars`, n, { shouldDirty: true })} />
            </div>

            <div>
              <span className={label}>Short description</span>
              <textarea
                {...form.register(`${base}.description`)}
                rows={3}
                placeholder="Room type, meals, highlights (no prices)"
                className={input}
              />
            </div>

            <div>
              <span className={label}>Photos ({images.length}) — 600×450 px (4:3), JPG/WebP under 100 KB, first photo shows first</span>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {images.map((img, i) => (
                  <div key={`${img.url}-${i}`} className="space-y-1 rounded-lg border bg-gray-50 p-1.5">
                    <ImageUploader
                      initialImage={img.url ? img : null}
                      className="aspect-[4/3]"
                      onUpload={(up) => {
                        if (!up) return;
                        const next = [...images];
                        next[i] = { url: up.url, public_id: up.public_id, alt: up.alt || form.getValues(`${base}.name`) || "" };
                        form.setValue(`${base}.images`, next, { shouldDirty: true });
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-6 w-full text-[10px]"
                      onClick={() => form.setValue(`${base}.images`, images.filter((_, j) => j !== i), { shouldDirty: true })}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7 gap-1 text-[11px]"
                onClick={() => form.setValue(`${base}.images`, [...images, { url: "", public_id: "", alt: "" }], { shouldDirty: true })}
              >
                <ImagePlus className="h-3.5 w-3.5" /> Add photo
              </Button>
            </div>
          </div>
        );
      })}

      <Button type="button" size="sm" className="h-8 gap-1 bg-[#FE5300] text-[12px] hover:bg-[#e44a00]" onClick={() => hotels.append({ ...EMPTY_HOTEL })}>
        <Plus className="h-3.5 w-3.5" /> Add hotel
      </Button>
    </div>
  );
}
