import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { fetchLocationSuggestions } from '../services/geocoding';
import type { LocationSuggestion } from '../types/trip';

interface UseLocationAutocompleteArgs {
  query: string;
  /** Set false when a GPS fix has already resolved the field — skips API calls */
  enabled: boolean;
}

interface UseLocationAutocompleteResult {
  suggestions: LocationSuggestion[];
  isLoading: boolean;
  isError: boolean;
}

export function useLocationAutocomplete({
  query,
  enabled,
}: UseLocationAutocompleteArgs): UseLocationAutocompleteResult {
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['location-autocomplete', debouncedQuery],
    queryFn: () => fetchLocationSuggestions(debouncedQuery),
    enabled: enabled && debouncedQuery.trim().length >= 3,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return {
    suggestions: data ?? [],
    isLoading,
    isError,
  };
}
