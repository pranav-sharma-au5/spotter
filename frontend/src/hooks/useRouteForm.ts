import { useState, useCallback } from 'react';
import type { RouteField, RouteValues } from '../components/input/RouteSpine';
import type { LocationSuggestion, TripRequest } from '../types/trip';

interface SelectionState {
  current: boolean;
  pickup: boolean;
  dropoff: boolean;
}

function buildInitialRoute(stored?: TripRequest | null): RouteValues {
  return {
    current: stored?.current_location ?? '',
    pickup: stored?.pickup_location ?? '',
    dropoff: stored?.dropoff_location ?? '',
  };
}

function buildInitialSelections(stored?: TripRequest | null): SelectionState {
  return {
    current: !!stored?.current_location,
    pickup: !!stored?.pickup_location,
    dropoff: !!stored?.dropoff_location,
  };
}

export function submitHint(selections: SelectionState): string {
  const missing: string[] = [];
  if (!selections.current) missing.push('current location');
  if (!selections.pickup) missing.push('pickup');
  if (!selections.dropoff) missing.push('dropoff');
  if (missing.length === 3) return 'Fill in all locations to continue';
  return `Select a suggestion for: ${missing.join(', ')}`;
}

export function useRouteForm(storedRequest?: TripRequest | null) {
  const [route, setRoute] = useState<RouteValues>(() => buildInitialRoute(storedRequest));
  const [selections, setSelections] = useState<SelectionState>(() =>
    buildInitialSelections(storedRequest),
  );
  const [cycleHrs, setCycleHrs] = useState(storedRequest?.cycle_used_hrs ?? 0);

  const canSubmit = selections.current && selections.pickup && selections.dropoff;

  const handleChange = useCallback((field: RouteField, value: string) => {
    setRoute((prev) => ({ ...prev, [field]: value }));
    setSelections((prev) => ({ ...prev, [field]: false }));
  }, []);

  const handleSelect = useCallback((field: RouteField, suggestion: LocationSuggestion) => {
    setRoute((prev) => ({ ...prev, [field]: suggestion.shortName }));
    setSelections((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSwap = useCallback(() => {
    setRoute((prev) => ({
      ...prev,
      pickup: prev.dropoff,
      dropoff: prev.pickup,
    }));
    setSelections((prev) => ({
      ...prev,
      pickup: prev.dropoff,
      dropoff: prev.pickup,
    }));
  }, []);

  const buildPayload = useCallback(
    (): TripRequest => ({
      current_location: route.current,
      pickup_location: route.pickup,
      dropoff_location: route.dropoff,
      cycle_used_hrs: cycleHrs,
    }),
    [route, cycleHrs],
  );

  return {
    route,
    selections,
    cycleHrs,
    setCycleHrs,
    canSubmit,
    submitHint: submitHint(selections),
    handleChange,
    handleSelect,
    handleSwap,
    buildPayload,
  };
}
