import { VerificationPanel } from '../verification/VerificationPanel';
import { Button } from '../ui/Button';
import type { VerificationRouteDetail } from '../../types/trip';

interface VerifyContentSectionProps {
  detail: VerificationRouteDetail;
  onViewSummary: () => void;
  onViewDetail: () => void;
}

export function VerifyContentSection({
  detail,
  onViewSummary,
  onViewDetail,
}: VerifyContentSectionProps) {
  return (
    <>
      <VerificationPanel detail={detail} />

      {detail.status === 'ok' && detail.plan && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" className="flex-1 py-3" onClick={onViewSummary}>
            View summary & map →
          </Button>
          <Button variant="ghost" className="flex-1 py-3" onClick={onViewDetail}>
            View itinerary & ELD →
          </Button>
        </div>
      )}
    </>
  );
}
