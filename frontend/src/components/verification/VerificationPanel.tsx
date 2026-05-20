import { useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import type { TripDay, VerificationRouteDetail } from '../../types/trip';
import { Button } from '../ui/Button';
import { Eyebrow } from '../ui/Eyebrow';
import {
  buildLlmReviewText,
  daysWithinRange,
  loadChecklist,
  milesWithinTolerance,
  saveChecklist,
  type ManualChecklist,
} from './verificationUtils';
import { getVerificationExportMarkdown } from '../../services/api';

interface VerificationPanelProps {
  detail: VerificationRouteDetail;
}

function AutoCheck({
  label,
  pass,
}: {
  label: string;
  pass: boolean | null;
}) {
  if (pass === null) return null;
  return (
    <li className="flex items-start gap-2 text-sm">
      {pass ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <span className={pass ? 'text-text-secondary' : 'text-text-primary'}>{label}</span>
    </li>
  );
}

function ManualCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-text-secondary">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function VerificationPanel({ detail }: VerificationPanelProps) {
  const { route } = detail;
  const slug = route.slug;
  const plan = detail.plan;
  const summary = plan?.summary;
  const days: TripDay[] = plan?.days ?? [];

  const [checklist, setChecklist] = useState<ManualChecklist>(() => loadChecklist(slug));
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const orsMiles = detail.ors_miles ?? summary?.total_miles ?? null;
  const totalDays = summary?.total_days ?? null;

  const milesOk =
    orsMiles != null ? milesWithinTolerance(orsMiles, route.expected_miles) : null;
  const daysOk =
    totalDays != null
      ? daysWithinRange(totalDays, route.expected_min_days, route.expected_max_days)
      : null;

  const dayLimitIssues = days.filter(
    (d) => d.total_driving_hrs > 11.05 || d.total_on_duty_hrs > 14.05,
  );

  const updateChecklist = (patch: Partial<ManualChecklist>) => {
    const next = { ...checklist, ...patch };
    setChecklist(next);
    saveChecklist(slug, next);
  };

  const handleCopyLlm = async () => {
    try {
      let text: string;
      try {
        text = await getVerificationExportMarkdown(slug);
      } catch {
        text = buildLlmReviewText(route, orsMiles, totalDays, days);
      }
      await navigator.clipboard.writeText(text);
      setCopyStatus('ok');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
    }
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
              label={`ORS miles (${orsMiles != null ? Math.round(orsMiles) : '—'}) within ±10% of ~${Math.round(route.expected_miles)}`}
              pass={milesOk}
            />
            <AutoCheck
              label={`Day count (${totalDays ?? '—'}) in range ${route.expected_min_days}–${route.expected_max_days}`}
              pass={daysOk}
            />
            <AutoCheck
              label={`All days ≤ 11h drive / 14h on-duty (${dayLimitIssues.length} issues)`}
              pass={days.length > 0 ? dayLimitIssues.length === 0 : null}
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
