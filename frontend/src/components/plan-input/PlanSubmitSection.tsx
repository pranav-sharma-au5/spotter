import { AlertCircle } from 'lucide-react';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { PlanningProgress } from '../input/PlanningProgress';
import type { PlanStep } from '../../types/trip';

interface PlanSubmitSectionProps {
  canSubmit: boolean;
  isPending: boolean;
  errorMessage: string | null;
  planStep: PlanStep;
  submitHint: string;
  onSubmit: () => void;
}

export function PlanSubmitSection({
  canSubmit,
  isPending,
  errorMessage,
  planStep,
  submitHint,
  onSubmit,
}: PlanSubmitSectionProps) {
  return (
    <>
      {errorMessage && (
        <AlertBanner icon={<AlertCircle />}>{errorMessage}</AlertBanner>
      )}

      <div className="space-y-2">
        <Button
          variant="primary"
          disabled={!canSubmit || isPending}
          onClick={onSubmit}
          className="flex h-12 w-full flex-col items-center justify-center py-0"
        >
          {isPending ? (
            <div className="flex flex-col items-center gap-3 py-1">
              <PlanningProgress planStep={planStep === 'idle' ? 'routing' : planStep} compact />
            </div>
          ) : (
            <>
              <span>Plan my trip</span>
              <span className="text-[11px] opacity-65">route map + ELD</span>
            </>
          )}
        </Button>

        {!canSubmit && !isPending && (
          <p className="text-center text-[11px] text-text-muted">{submitHint}</p>
        )}
      </div>
    </>
  );
}
