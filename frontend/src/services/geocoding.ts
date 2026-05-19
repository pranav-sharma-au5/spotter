import type { LocationSuggestion } from '../types/trip';

const PHOTON_BASE = 'https://photon.komoot.io/api/';

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

// ── Display name builder ──────────────────────────────────────────────────────

function buildDisplayName(p: PhotonProperties): string {
  const parts: string[] = [];

  if (p.name) parts.push(p.name);
  if (p.city && p.city !== p.name) parts.push(p.city);
  if (p.state) parts.push(p.state);
  if (p.country) parts.push(p.country);

  // Guarantee at least two parts
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

// ── US-first sort ─────────────────────────────────────────────────────────────

function usFirst(a: PhotonFeature, b: PhotonFeature): number {
  const aUS = a.properties.country === 'United States' ? 0 : 1;
  const bUS = b.properties.country === 'United States' ? 0 : 1;
  return aUS - bUS;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchLocationSuggestions(
  query: string,
): Promise<LocationSuggestion[]> {
  try {
    const url = new URL(PHOTON_BASE);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '6');
    url.searchParams.set('lang', 'en');

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data: PhotonResponse = await res.json();

    return data.features
      .filter(
        (f) =>
          Array.isArray(f.geometry?.coordinates) &&
          f.geometry.coordinates.length === 2,
      )
      .sort(usFirst)
      .map((f): LocationSuggestion => ({
        id: (f.properties.osm_id ?? Math.random()).toString(),
        displayName: buildDisplayName(f.properties),
        shortName: buildShortName(f.properties),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }));
  } catch {
    // Degrade gracefully — callers fall back to plain text input
    return [];
  }
}
