interface PhotonProperties {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface NominatimAddress {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

export function toCountryCode(country: string | undefined): 'US' | 'CA' | undefined {
  if (country === 'United States') return 'US';
  if (country === 'Canada') return 'CA';
  return undefined;
}

export function buildDisplayName(p: PhotonProperties): string {
  const parts: string[] = [];
  if (p.name) parts.push(p.name);
  if (p.city && p.city !== p.name) parts.push(p.city);
  if (p.state) parts.push(p.state);
  if (p.country) parts.push(p.country);
  if (parts.length < 2) {
    if (p.country && !parts.includes(p.country)) parts.push(p.country);
    if (parts.length < 2 && p.state && !parts.includes(p.state)) parts.push(p.state);
  }
  return parts.join(', ');
}

export function buildShortName(p: PhotonProperties): string {
  const first = p.name ?? p.city ?? '';
  const second = p.state ?? p.country ?? '';
  return [first, second].filter(Boolean).join(', ') || buildDisplayName(p);
}

export function buildShortNameFromAddress(
  address: NominatimAddress | undefined,
  fallback: string,
): string {
  if (!address) return fallback;
  const street = address.road ?? address.suburb ?? address.neighbourhood;
  const place = address.city ?? address.town ?? address.village;
  const region = address.state ?? address.country;
  const first = street ?? place ?? '';
  const second = region ?? '';
  if (!first && !second) return fallback;
  return [first, second].filter(Boolean).join(', ');
}
