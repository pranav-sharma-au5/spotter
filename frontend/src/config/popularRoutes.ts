import type { LocationSuggestion } from '../types/trip';

export interface PopularLocation {
  id: string;
  /** Value written to the input and sent to the API */
  shortName: string;
  /** Optional secondary label for tooltip / displayName */
  displayName?: string;
}

export interface PopularRoute {
  id: string;
  /** Compact label for the chip, e.g. "Seattle → Miami" */
  label: string;
  pickup: PopularLocation;
  dropoff: PopularLocation;
  title?: string;
}

export const POPULAR_ROUTES: PopularRoute[] = [
  {
    id: 'seattle-miami',
    label: 'Seattle → Miami',
    pickup: { id: 'seattle-wa', shortName: 'Seattle, WA' },
    dropoff: { id: 'miami-fl', shortName: 'Miami, FL' },
  },
  {
    id: 'newark-la',
    label: 'Newark → Los Angeles',
    pickup: { id: 'newark-nj', shortName: 'Newark, NJ' },
    dropoff: { id: 'los-angeles-ca', shortName: 'Los Angeles, CA' },
  },
  {
    id: 'dallas-portland',
    label: 'Dallas → Portland',
    pickup: { id: 'dallas-tx', shortName: 'Dallas, TX' },
    dropoff: { id: 'portland-or', shortName: 'Portland, OR' },
  },
  {
    id: 'chicago-sacramento',
    label: 'Chicago → Sacramento',
    pickup: { id: 'chicago-il', shortName: 'Chicago, IL' },
    dropoff: { id: 'sacramento-ca', shortName: 'Sacramento, CA' },
  },
  {
    id: 'la-chicago',
    label: 'Los Angeles → Chicago',
    pickup: { id: 'los-angeles-ca', shortName: 'Los Angeles, CA' },
    dropoff: { id: 'chicago-il', shortName: 'Chicago, IL' },
  },
  {
    id: 'socal-atlanta',
    label: 'SoCal → Atlanta',
    pickup: {
      id: 'southern-california',
      shortName: 'Los Angeles, CA',
      displayName: 'Los Angeles metro area',
    },
    dropoff: { id: 'atlanta-ga', shortName: 'Atlanta, GA' },
    title: 'Southern California (Los Angeles) to Atlanta',
  },
  {
    id: 'houston-philadelphia',
    label: 'Houston → Philadelphia',
    pickup: { id: 'houston-tx', shortName: 'Houston, TX' },
    dropoff: { id: 'philadelphia-pa', shortName: 'Philadelphia, PA' },
  },
  {
    id: 'anchorage-prudhoe',
    label: 'Anchorage → Prudhoe Bay',
    pickup: { id: 'anchorage-ak', shortName: 'Anchorage, AK' },
    dropoff: { id: 'prudhoe-bay-ak', shortName: 'Prudhoe Bay, AK' },
  },
];

export function toLocationSuggestion(
  location: PopularLocation,
  prefix: string,
): LocationSuggestion {
  return {
    id: `popular-${prefix}-${location.id}`,
    displayName: location.displayName ?? location.shortName,
    shortName: location.shortName,
    lat: 0,
    lng: 0,
    countryCode: 'US',
  };
}
