import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { Eyebrow } from '../ui/Eyebrow';
import { SelectableCard } from '../ui/SelectableCard';
import { verificationRoutesQueryOptions } from '../../services/api';
import { isVerificationEnabled } from '../../config/verification';
import { getVerificationListState, getVerificationStatusDisplay } from './statusUtils';
import type { VerificationRouteSummary } from '../../types/trip';

function VerificationRouteCard({ route }: { route: VerificationRouteSummary }) {
  const navigate = useNavigate();
  const { label, className, canView } = getVerificationStatusDisplay(route.status);

  return (
    <SelectableCard
      isActive={canView}
      isDisabled={!canView}
      onClick={() => navigate(`/verify/${route.slug}`)}
      className="gap-2 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{route.name}</p>
        <span className={['shrink-0 rounded-full border px-2 py-px text-[10px]', className].join(' ')}>
          {label}
        </span>
      </div>
      <p className="text-xs text-text-secondary">
        ~{Math.round(route.expected_miles)} mi expected
        {route.ors_miles != null ? ` · ${Math.round(route.ors_miles)} mi ORS` : ''}
        {route.total_days != null ? ` · ${route.total_days} days` : ''}
      </p>
      {route.error_message && route.status === 'failed' && (
        <p className="line-clamp-2 text-[10px] text-amber-400">{route.error_message}</p>
      )}
    </SelectableCard>
  );
}

export function VerificationRouteList() {
  const { data: routes, isError, isLoading } = useQuery(verificationRoutesQueryOptions());
  const listState = getVerificationListState({
    enabled: isVerificationEnabled,
    isError,
    isLoading,
    routes,
  });

  if (listState.kind === 'hidden' || listState.kind === 'empty') return null;

  if (listState.kind === 'loading') {
    return (
      <section className="mt-10">
        <Eyebrow className="mb-3">Verification routes</Eyebrow>
        <p className="text-xs text-text-muted">Loading saved plans…</p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-accent" />
        <Eyebrow>Verification routes</Eyebrow>
      </div>
      <p className="mb-4 text-xs text-text-secondary">
        Local test corridors with saved plans. Review map, itinerary, and ELD; copy for LLM scoring.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listState.routes.map((route) => (
          <VerificationRouteCard key={route.slug} route={route} />
        ))}
      </div>
    </section>
  );
}
