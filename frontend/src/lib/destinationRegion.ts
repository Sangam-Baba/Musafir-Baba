export type DestinationRegion = "domestic" | "international";

// `region` is optional on destinations; when it isn't set, India is domestic
// and everything else is international.
export function getDestinationRegion(destination: {
  region?: string | null;
  country?: string;
}): DestinationRegion {
  if (destination.region === "domestic" || destination.region === "international") {
    return destination.region;
  }
  return destination.country?.toLowerCase() === "india" ? "domestic" : "international";
}

// Public URL of a destination page. Sub-destinations live under their parent.
export function getDestinationHref(destination: {
  state?: string;
  slug?: string;
  parent?: { slug?: string } | string | null;
}): string {
  if (destination.parent && typeof destination.parent === "object" && destination.parent.slug) {
    return `/destinations/${destination.parent.slug}/${destination.slug}`;
  }
  return `/destinations/${destination.state}`;
}
