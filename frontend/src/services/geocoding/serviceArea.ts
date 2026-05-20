import type { LocationSuggestion } from '../../types/trip';

export const SERVICE_AREA_ERROR =
  'Location must be in the United States or Canada.';

/** Matches the Photon search bbox — continental US/CA plus AK/HI. */
const MIN_LNG = -180;
const MIN_LAT = 18;
const MAX_LNG = -52;
const MAX_LAT = 84;

export function isInServiceAreaBounds(lat: number, lng: number): boolean {
  return lng >= MIN_LNG && lng <= MAX_LNG && lat >= MIN_LAT && lat <= MAX_LAT;
}

export function isSupportedCountryCode(
  countryCode: LocationSuggestion['countryCode'],
): boolean {
  return countryCode === 'US' || countryCode === 'CA';
}

export function isSupportedLocation(suggestion: LocationSuggestion): boolean {
  if (suggestion.countryCode) {
    return isSupportedCountryCode(suggestion.countryCode);
  }

  // Popular-route chips and other trusted presets carry countryCode; when it is
  // missing, fall back to coordinates (e.g. GPS reverse geocode without country).
  if (suggestion.lat === 0 && suggestion.lng === 0) {
    return false;
  }

  return isInServiceAreaBounds(suggestion.lat, suggestion.lng);
}
