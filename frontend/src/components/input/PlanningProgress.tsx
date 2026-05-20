import { Check, Loader2 } from 'lucide-react';
import type { PlanStep } from '../../types/trip';

interface Step {
  key: PlanStep;
  label: string;
}

const STEPS: Step[] = [
  { key: 'routing', label: 'Finding your route' },
  { key: 'scheduling', label: 'Building HOS schedule' },
  { key: 'enriching', label: 'Locating rest stops' },
];

function stepIndex(step: PlanStep): number {
  switch (step) {
    case 'routing': return 0;
    case 'scheduling': return 1;
    case 'enriching': return 2;
    case 'done': return 3;
    default: return -1;
  }
}

interface PlanningProgressProps {
  planStep: PlanStep;
  compact?: boolean;
}

export function PlanningProgress({ planStep, compact = false }: PlanningProgressProps) {
  const current = stepIndex(planStep);
  if (current < 0) return null;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {STEPS.map((step, index) => {
        const isComplete = current > index || planStep === 'done';
        const isActive = current === index && planStep !== 'done';

        return (
          <div key={step.key} className="flex items-center gap-2.5">
            <span className={[
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              isComplete ? 'bg-accent text-white' : isActive ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted',
            ].join(' ')}>
              {isComplete ? (
                <Check className="h-3 w-3" />
              ) : isActive ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
              )}
            </span>
            <span className={[
              compact ? 'text-xs' : 'text-sm',
              isActive || isComplete ? 'font-medium text-text-primary' : 'text-text-muted',
            ].join(' ')}>
              {step.label}
              {isActive ? '...' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
