// Browser-safe location helpers shared by every page that shows an IP location.

export type Place = { city?: string | null; region?: string | null; country?: string | null };

const clean = (v: string | null | undefined) => (v ?? "").trim();

/** "Reno, Nevada" — falls back to the country, or "" when nothing is known. */
export function locationLabel(p: Place): string {
  const city = clean(p.city);
  const region = clean(p.region);
  return [city, region].filter(Boolean).join(", ") || clean(p.country);
}

/** Google Maps search link for a location, or "" when nothing is known (so no dead link renders). */
export function mapsUrl(p: Place): string {
  const q = [p.city, p.region, p.country].map(clean).filter(Boolean).join(", ");
  if (!q) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Google Maps search link for a written street address, or "" when there isn't one (so no dead link renders). */
export function addressMapsUrl(address: string | null | undefined): string {
  const q = clean(address);
  if (!q) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Google search link for researching a business by name (optionally narrowed by location), or "" with no name. */
export function googleSearchUrl(name: string | null | undefined, location?: string | null): string {
  const business = clean(name);
  if (!business) return "";
  const q = [business, clean(location)].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

