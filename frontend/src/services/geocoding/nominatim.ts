import type { LocationSuggestion } from '../../types/trip';
import { buildShortNameFromAddress, toCountryCode } from './formatLocationName';

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
