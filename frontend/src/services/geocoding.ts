import type { LocationSuggestion } from '../types/trip';

const PHOTON_BASE = 'https://photon.komoot.io/api/';

// Bounding box that covers the contiguous US, Alaska, Hawaii, and Canada.
// Photon uses minLon,minLat,maxLon,maxLat (standard GeoJSON order).
const US_CA_BBOX = '-180,18,-52,84';

// Countries we serve — Photon returns full English names.
const ALLOWED_COUNTRIES = new Set(['United States', 'Canada']);

// ── Photon GeoJSON types ──────────────────────────────────────────────────────

interface PhotonProperties {
  osm_id?: number;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  street?: string;
  housenumber?: string;
}

interface PhotonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: PhotonProperties;
}

interface PhotonResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCountryCode(country: string | undefined): 'US' | 'CA' | undefined {
  if (country === 'United States') return 'US';
  if (country === 'Canada') return 'CA';
  return undefined;
}

function buildDisplayName(p: PhotonProperties): string {
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

function buildShortName(p: PhotonProperties): string {
  const first = p.name ?? p.city ?? '';
  const second = p.state ?? p.country ?? '';
  return [first, second].filter(Boolean).join(', ') || buildDisplayName(p);
}

// US results before Canadian results, preserving original order within each group.
function sortUSThenCA(a: PhotonFeature, b: PhotonFeature): number {
  const rank = (c?: string) => (c === 'United States' ? 0 : c === 'Canada' ? 1 : 2);
  return rank(a.properties.country) - rank(b.properties.country);
}

// ── Nominatim reverse-geocoding types ─────────────────────────────────────────

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

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

const NOMINATIM_REVERSE_BASE = 'https://nominatim.openstreetmap.org/reverse';

function buildShortNameFromAddress(
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

/**
 * Resolves a lat/lng coordinate to a human-readable `LocationSuggestion` using
 * the Nominatim reverse-geocoding API.  Falls back to raw coordinate strings if
 * the request fails.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<LocationSuggestion> {
  const fallback: LocationSuggestion = {
    id: 'gps-resolved',
    displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    shortName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };

  try {
    const url = new URL(NOMINATIM_REVERSE_BASE);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) return fallback;

    const data: NominatimResponse = await res.json();
    const displayName = data.display_name ?? fallback.displayName;
    const shortName = buildShortNameFromAddress(data.address, displayName);
    const countryCode = toCountryCode(data.address?.country);

    return { id: 'gps-resolved', displayName, shortName, lat, lng, countryCode };
  } catch {
    return fallback;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchLocationSuggestions(
  query: string,
): Promise<LocationSuggestion[]> {
  try {
    const url = new URL(PHOTON_BASE);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '10'); // fetch extra — some will be filtered
    url.searchParams.set('lang', 'en');
    url.searchParams.set('bbox', US_CA_BBOX); // pre-filter at API level

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data: PhotonResponse = await res.json();

    return data.features
      .filter(
        (f) =>
          // Valid coordinates
          Array.isArray(f.geometry?.coordinates) &&
          f.geometry.coordinates.length === 2 &&
          // Country-level gate — belt-and-suspenders on top of bbox
          ALLOWED_COUNTRIES.has(f.properties.country ?? ''),
      )
      .sort(sortUSThenCA)
      .slice(0, 6) // cap back to 6 after filtering
      .map((f): LocationSuggestion => ({
        id: (f.properties.osm_id ?? Math.random()).toString(),
        displayName: buildDisplayName(f.properties),
        shortName: buildShortName(f.properties),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        countryCode: toCountryCode(f.properties.country),
      }));
  } catch {
    return [];
  }
}
