import type { LocationSuggestion } from '../../types/trip';
import {
  buildDisplayName,
  buildShortName,
  toCountryCode,
} from './formatLocationName';
import { isSupportedCountryCode } from './serviceArea';

const PHOTON_BASE = 'https://photon.komoot.io/api/';
const US_CA_BBOX = '-180,18,-52,84';

interface PhotonProperties {
  osm_id?: number;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  countrycode?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export function resolvePhotonCountryCode(
  properties: PhotonProperties,
): LocationSuggestion['countryCode'] {
  return toCountryCode(properties.countrycode) ?? toCountryCode(properties.country);
}

function sortUSThenCA(a: PhotonFeature, b: PhotonFeature): number {
  const rank = (code: LocationSuggestion['countryCode']) => (code === 'US' ? 0 : code === 'CA' ? 1 : 2);
  return rank(resolvePhotonCountryCode(a.properties)) - rank(resolvePhotonCountryCode(b.properties));
}

export function photonFeatureToSuggestion(f: PhotonFeature): LocationSuggestion {
  return {
    id: (f.properties.osm_id ?? Math.random()).toString(),
    displayName: buildDisplayName(f.properties),
    shortName: buildShortName(f.properties),
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    countryCode: resolvePhotonCountryCode(f.properties),
  };
}

function isValidFeature(f: PhotonFeature): boolean {
  return (
    Array.isArray(f.geometry?.coordinates) &&
    f.geometry.coordinates.length === 2 &&
    isSupportedCountryCode(resolvePhotonCountryCode(f.properties))
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
  url.searchParams.append('countrycode', 'US');
  url.searchParams.append('countrycode', 'CA');

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data: PhotonResponse = await res.json();
  return filterAndRankSuggestions(data.features);
}
