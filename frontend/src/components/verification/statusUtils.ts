import type { VerificationRouteSummary } from '../../types/trip';

type VerificationStatus = VerificationRouteSummary['status'];

export interface VerificationStatusDisplay {
  label: string;
  className: string;
  canView: boolean;
}

const VERIFICATION_STATUS_DISPLAY: Record<VerificationStatus, VerificationStatusDisplay> = {
  ok: {
    label: 'OK',
    className: 'text-green-500 border-green-500/30',
    canView: true,
  },
  failed: {
    label: 'Failed',
    className: 'text-amber-400 border-amber-400/30',
    canView: false,
  },
  pending: {
    label: 'Pending',
    className: 'text-text-muted border-border-medium',
    canView: false,
  },
  not_seeded: {
    label: 'Not seeded',
    className: 'text-text-muted border-border-medium',
    canView: false,
  },
};

export function getVerificationStatusDisplay(
  status: VerificationStatus,
): VerificationStatusDisplay {
  return VERIFICATION_STATUS_DISPLAY[status];
}

export type VerificationListState =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; routes: VerificationRouteSummary[] };

export function getVerificationListState(opts: {
  enabled: boolean;
  isError: boolean;
  isLoading: boolean;
  routes: VerificationRouteSummary[] | undefined;
}): VerificationListState {
  if (!opts.enabled || opts.isError) return { kind: 'hidden' };
  if (opts.isLoading) return { kind: 'loading' };
  if (!opts.routes?.length) return { kind: 'empty' };
  return { kind: 'ready', routes: opts.routes };
}
