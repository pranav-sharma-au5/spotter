import axios, { AxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import type { TripPlan, TripRequest } from '../types/trip';

/**
 * Same-origin /api/* on Vercel (see vercel.json rewrites).
 * In dev, Vite proxies /api to the Django server.
 */
function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL || '';
  // Misconfigured production builds often set localhost — unusable on real devices.
  if (import.meta.env.PROD && /localhost|127\.0\.0\.1/i.test(configured)) {
    return '';
  }
  return configured;
}

const BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
});

interface ApiErrorBody {
  error?: string;
  code?: string;
  detail?: string | Record<string, unknown>;
}

function mapErrorCode(
  code: string | undefined,
  detail?: string | Record<string, unknown>,
): string {
  switch (code) {
    case 'location_not_found':
      return "We couldn't find that location. Try being more specific, e.g. 'Dallas, TX'.";
    case 'route_not_found':
      return "Couldn't find a route between those locations.";
    case 'insufficient_hours':
      return 'Not enough hours this week for this trip. Plan a shorter trip or take a 34-hr restart.';
    case 'facility_data_unavailable':
      return 'Facility data is temporarily unavailable. Please try again in a moment.';
    case 'invalid_request':
      return 'Please check your trip inputs and try again.';
    case 'internal_error':
      return typeof detail === 'string' ? detail : 'Something went wrong. Please try again.';
    default:
      if (typeof detail === 'string' && detail.trim()) return detail;
      return 'Something went wrong. Please try again.';
  }
}

function mapAxiosError(err: AxiosError<ApiErrorBody>): string {
  if (!err.response) {
    if (err.code === 'ECONNABORTED') {
      return 'The request timed out. Long trips can take a minute — please try again.';
    }
    return 'Could not connect to the server. Check your network and try again.';
  }
  const { data } = err.response;
  return mapErrorCode(data?.error ?? data?.code, data?.detail);
}

export async function planTrip(request: TripRequest): Promise<TripPlan> {
  const { data } = await apiClient.post<TripPlan>('/api/v1/trip/plan/', request);
  return data;
}

export function usePlanTripMutation(
  onSuccess: (plan: TripPlan) => void,
  onError: (message: string) => void,
) {
  return useMutation<TripPlan, AxiosError<ApiErrorBody>, TripRequest>({
    mutationFn: planTrip,
    onSuccess,
    onError: (err) => {
      onError(mapAxiosError(err));
    },
  });
}
