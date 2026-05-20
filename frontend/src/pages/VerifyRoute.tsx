import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { VerificationPanel } from '../components/verification/VerificationPanel';
import { Button } from '../components/ui/Button';
import { getVerificationRoute } from '../services/api';
import { useTripStore } from '../stores/tripStore';
import type { VerificationRouteDetail } from '../types/trip';

export function VerifyRoute() {
  const { slug } = useParams<{ slug: string }>();
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
          setError('Could not load verification route. Is the backend running with ENABLE_VERIFICATION=1?');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate, setRequest, setPlan, setRouteResult, setPlanStep]);

  if (!slug) return null;

  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      <Topbar backTo="/" backLabel="Dashboard" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        {loading && (
          <p className="text-sm text-text-secondary">Loading saved plan…</p>
        )}

        {error && (
          <p className="text-sm text-amber-400">{error}</p>
        )}

        {detail && !loading && (
          <>
            <VerificationPanel detail={detail} />

            {detail.status === 'ok' && detail.plan && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  className="flex-1 py-3"
                  onClick={() => navigate('/summary')}
                >
                  View summary & map →
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 py-3"
                  onClick={() => navigate('/detail')}
                >
                  View itinerary & ELD →
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
