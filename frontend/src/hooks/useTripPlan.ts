import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanTripMutation } from '../services/api';
import { useTripStore } from '../stores/tripStore';
import type { TripRequest } from '../types/trip';

export function useTripPlan() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const setPlan = useTripStore((s) => s.setPlan);
  const setRequest = useTripStore((s) => s.setRequest);

  const mutation = usePlanTripMutation(
    (plan) => {
      setPlan(plan);
      setErrorMessage(null);
      navigate('/summary');
    },
    (message) => {
      setErrorMessage(message);
    },
  );

  const submitTrip = (req: TripRequest) => {
    setRequest(req);
    setErrorMessage(null);
    mutation.mutate(req);
  };

  return {
    submitTrip,
    isPending: mutation.isPending,
    errorMessage,
    clearError: () => setErrorMessage(null),
  };
}
