import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { Eyebrow } from '../ui/Eyebrow';
import { verificationRoutesQueryOptions } from '../../services/api';
import { isVerificationEnabled } from '../../config/verification';
import type { VerificationRouteSummary } from '../../types/trip';

function statusLabel(status: VerificationRouteSummary['status']): string {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'failed':
      return 'Failed';
    case 'pending':
      return 'Pending';
    default:
      return 'Not seeded';
  }
}

function statusClass(status: VerificationRouteSummary['status']): string {
  switch (status) {
    case 'ok':
      return 'text-green-500 border-green-500/30';
    case 'failed':
      return 'text-amber-400 border-amber-400/30';
    default:
      return 'text-text-muted border-border-medium';
  }
}

function VerificationRouteCard({ route }: { route: VerificationRouteSummary }) {
  const navigate = useNavigate();
  const canView = route.status === 'ok';

  return (
    <button
      type="button"
      disabled={!canView}
      onClick={() => navigate(`/verify/${route.slug}`)}
      className={[
        'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors',
        canView
          ? 'cursor-pointer border-border-subtle bg-bg-surface hover:border-border-medium hover:bg-bg-elevated'
          : 'cursor-default border-border-subtle bg-bg-surface opacity-70',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{route.name}</p>
        <span
          className={[
            'shrink-0 rounded-full border px-2 py-px text-[10px]',
            statusClass(route.status),
          ].join(' ')}
        >
          {statusLabel(route.status)}
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
    </button>
  );
}

export function VerificationRouteList() {
  const { data: routes, isError, isLoading } = useQuery(verificationRoutesQueryOptions());

  if (!isVerificationEnabled) return null;
  if (isError) return null;
  if (isLoading) {
    return (
      <section className="mt-10">
        <Eyebrow className="mb-3">Verification routes</Eyebrow>
        <p className="text-xs text-text-muted">Loading saved plans…</p>
      </section>
    );
  }
  if (!routes?.length) return null;

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
        {routes.map((route) => (
          <VerificationRouteCard key={route.slug} route={route} />
        ))}
      </div>
    </section>
  );
}
