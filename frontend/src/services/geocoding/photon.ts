import type { LocationSuggestion } from '../../types/trip';
import {
  buildDisplayName,
  buildShortName,
  toCountryCode,
} from './formatLocationName';

const PHOTON_BASE = 'https://photon.komoot.io/api/';
const US_CA_BBOX = '-180,18,-52,84';
const ALLOWED_COUNTRIES = new Set(['United States', 'Canada']);

interface PhotonProperties {
  osm_id?: number;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export function isAllowedCountry(country: string | undefined): boolean {
  return ALLOWED_COUNTRIES.has(country ?? '');
}

function sortUSThenCA(a: PhotonFeature, b: PhotonFeature): number {
  const rank = (c?: string) => (c === 'United States' ? 0 : c === 'Canada' ? 1 : 2);
  return rank(a.properties.country) - rank(b.properties.country);
}

export function photonFeatureToSuggestion(f: PhotonFeature): LocationSuggestion {
  return {
    id: (f.properties.osm_id ?? Math.random()).toString(),
    displayName: buildDisplayName(f.properties),
    shortName: buildShortName(f.properties),
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    countryCode: toCountryCode(f.properties.country),
  };
}

function isValidFeature(f: PhotonFeature): boolean {
  return (
    Array.isArray(f.geometry?.coordinates) &&
    f.geometry.coordinates.length === 2 &&
    isAllowedCountry(f.properties.country)
  );
}

export function filterAndRankSuggestions(features: PhotonFeature[]): LocationSuggestion[] {
  return features
    .filter(isValidFeature)
    .sort(sortUSThenCA)
    .slice(0, 6)
    .map(photonFeatureToSuggestion);
}

export async function fetchPhotonSuggestions(query: string): Promise<LocationSuggestion[]> {
  const url = new URL(PHOTON_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '10');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('bbox', US_CA_BBOX);

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data: PhotonResponse = await res.json();
  return filterAndRankSuggestions(data.features);
}
