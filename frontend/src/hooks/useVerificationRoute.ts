import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVerificationRoute } from '../services/api';
import { useTripStore } from '../stores/tripStore';
import type { VerificationRouteDetail } from '../types/trip';

export function useVerificationRoute(slug: string | undefined) {
  const navigate = useNavigate();
  const setRequest = useTripStore((s) => s.setRequest);
  const setPlan = useTripStore((s) => s.setPlan);
  const setRouteResult = useTripStore((s) => s.setRouteResult);
  const setPlanStep = useTripStore((s) => s.setPlanStep);

  const [detail, setDetail] = useState<VerificationRouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      navigate('/');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getVerificationRoute(slug)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);

        if (data.request && data.plan && data.route_result && data.status === 'ok') {
          setRequest(data.request);
          setPlan(data.plan);
          setRouteResult(data.route_result);
          setPlanStep('done');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'Could not load verification route. Is the backend running with ENABLE_VERIFICATION=1?',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate, setRequest, setPlan, setRouteResult, setPlanStep]);

  return { detail, loading, error };
}
