import { useState, useCallback } from 'react';
import { Copy, Download } from 'lucide-react';
import type { TripDay, VerificationRouteDetail, VerificationRouteMeta } from '../../types/trip';
import { Button } from '../ui/Button';
import { Eyebrow } from '../ui/Eyebrow';
import { AutoCheck, ManualCheck } from './ChecklistItems';
import { buildLlmReviewText } from './verificationChecks';
import { loadChecklist, saveChecklist, type ManualChecklist } from './verificationStorage';
import { useVerificationChecks } from '../../hooks/useVerificationChecks';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';
import { getVerificationExportMarkdown } from '../../services/api';

interface VerificationPanelProps {
  detail: VerificationRouteDetail;
}

async function fetchExportOrFallback(
  slug: string,
  route: VerificationRouteMeta,
  orsMiles: number | null,
  totalDays: number | null,
  days: TripDay[],
): Promise<string> {
  try {
    return await getVerificationExportMarkdown(slug);
  } catch {
    return buildLlmReviewText(route, orsMiles, totalDays, days ?? []);
  }
}

export function VerificationPanel({ detail }: VerificationPanelProps) {
  const { route } = detail;
  const slug = route.slug;
  const days = detail.plan?.days ?? [];
  const checks = useVerificationChecks(detail);

  const [checklist, setChecklist] = useState<ManualChecklist>(() => loadChecklist(slug));

  const getCopyText = useCallback(
    () => fetchExportOrFallback(slug, route, checks.orsMiles, checks.totalDays, days),
    [slug, route, checks.orsMiles, checks.totalDays, days],
  );
  const { status: copyStatus, copy: handleCopyLlm } = useClipboardCopy(getCopyText);

  const updateChecklist = (patch: Partial<ManualChecklist>) => {
    const next = { ...checklist, ...patch };
    setChecklist(next);
    saveChecklist(slug, next);
  };

  const handleDownloadMd = () => {
    window.open(`/api/v1/verification/routes/${slug}/export/`, '_blank');
  };

  if (detail.status === 'failed' || detail.status === 'not_seeded') {
    return (
      <section className="rounded-xl border border-border-subtle bg-bg-surface p-4 md:p-5">
        <Eyebrow className="mb-2">Verification</Eyebrow>
        <p className="text-sm text-text-primary">{route.name}</p>
        <p className="mt-2 text-sm text-amber-400">
          {detail.status === 'not_seeded'
            ? 'No saved plan. Run: python manage.py seed_verification_plans'
            : detail.error_message || 'Planning failed for this route.'}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border-subtle bg-bg-surface p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow className="mb-1">Verification</Eyebrow>
          <h2 className="text-lg font-semibold text-text-primary">{route.name}</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Expected ~{Math.round(route.expected_miles)} mi · {route.expected_min_days}–
            {route.expected_max_days} days
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" className="text-xs" onClick={handleCopyLlm}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copyStatus === 'ok' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : 'Copy for LLM review'}
          </Button>
          <Button variant="ghost" className="text-xs" onClick={handleDownloadMd}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export .md
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Auto checks
          </p>
          <ul className="space-y-2">
            <AutoCheck
              label={`ORS miles (${checks.orsMiles != null ? Math.round(checks.orsMiles) : '—'}) within ±10% of ~${Math.round(route.expected_miles)}`}
              pass={checks.milesOk}
            />
            <AutoCheck
              label={`Day count (${checks.totalDays ?? '—'}) in range ${route.expected_min_days}–${route.expected_max_days}`}
              pass={checks.daysOk}
            />
            <AutoCheck
              label={`All days ≤ 11h drive / 14h on-duty (${checks.dayLimitIssues.length} issues)`}
              pass={days.length > 0 ? checks.dayLimitIssues.length === 0 : null}
            />
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Manual checks
          </p>
          <div className="space-y-2">
            <ManualCheck
              label="Map corridor looks plausible"
              checked={checklist.mapPlausible}
              onChange={(v) => updateChecklist({ mapPlausible: v })}
            />
            <ManualCheck
              label="Pickup / dropoff markers correct"
              checked={checklist.pickupDropoffCorrect}
              onChange={(v) => updateChecklist({ pickupDropoffCorrect: v })}
            />
            <ManualCheck
              label="Rest stops in sensible locations"
              checked={checklist.restStopsSensible}
              onChange={(v) => updateChecklist({ restStopsSensible: v })}
            />
            <ManualCheck
              label="ELD grid matches sidebar (all days)"
              checked={checklist.eldMatchesSidebar}
              onChange={(v) => updateChecklist({ eldMatchesSidebar: v })}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
