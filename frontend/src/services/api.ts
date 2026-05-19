import axios, { AxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import type { TripPlan, TripRequest } from '../types/trip';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

interface ApiError {
  code?: string;
  detail?: string;
}

function mapErrorCode(code: string | undefined): string {
  switch (code) {
    case 'location_not_found':
      return "We couldn't find that location. Try being more specific, e.g. 'Dallas, TX'.";
    case 'route_not_found':
      return "Couldn't find a route between those locations.";
    case 'insufficient_hours':
      return "Not enough hours this week for this trip. Plan a shorter trip or take a 34-hr restart.";
    default:
      return 'Something went wrong. Please try again.';
  }
}

export async function planTrip(request: TripRequest): Promise<TripPlan> {
  const { data } = await apiClient.post<TripPlan>('/api/v1/trip/plan/', request);
  return data;
}

export function usePlanTripMutation(
  onSuccess: (plan: TripPlan) => void,
  onError: (message: string) => void,
) {
  return useMutation<TripPlan, AxiosError<ApiError>, TripRequest>({
    mutationFn: planTrip,
    onSuccess,
    onError: (err) => {
      const code = err.response?.data?.code;
      onError(mapErrorCode(code));
    },
  });
}
