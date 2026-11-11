// Single source of truth for public rental URLs:
//   /rental/{location}/{type}/{slug}   vehicle detail
//   /rental/{location}/{type}          vehicles of a type at a location
//   /rental/{location}                 all vehicles at a location
//   /rental/{type}                     all vehicles of a type (kept as before)
//
// The detail page redirects (308) any other path for a vehicle — including
// the old /rental/{type}/{location}/{slug} shape — to rentalVehiclePath().

// Same output as the backend's slugify(s, { lower: true, strict: true }),
// which generates VehicleType / VehiclePickUpDestination slugs.
export function rentalSlug(value?: string | null): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/%/g, "percent")
    .replace(/ß/g, "ss")
    .replace(/[^A-Za-z0-9\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export interface RentalUrlVehicle {
  slug: string;
  vehicleType?: string | null;
  location?: { slug?: string | null; name?: string | null } | null;
}

export function rentalLocationSlug(v: RentalUrlVehicle): string {
  // Normalised even when the DB slug exists, so every segment is [a-z0-9-]
  // (a valid slug passes through unchanged)
  return rentalSlug(v.location?.slug) || rentalSlug(v.location?.name) || "any";
}

export function rentalTypeSlug(v: RentalUrlVehicle): string {
  return rentalSlug(v.vehicleType) || "other";
}

export function rentalVehiclePath(v: RentalUrlVehicle): string {
  return `/rental/${rentalLocationSlug(v)}/${rentalTypeSlug(v)}/${v.slug}`;
}
