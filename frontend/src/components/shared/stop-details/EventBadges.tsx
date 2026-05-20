import { BadgeChip } from './BadgeChip';
import { getStopDetailsStyles } from './stopDetailsStyles';
import type { StopDetailsEventProps, StopDetailsVariant } from './types';

interface EventBadgesProps extends StopDetailsEventProps {
  variant: StopDetailsVariant;
}

export function EventBadges({ event, variant }: EventBadgesProps) {
  const styles = getStopDetailsStyles(variant);
  const showCombined = event.satisfies.length > 1;
  const showEarly = event.early_stop;

  if (!showCombined && !showEarly) return null;

  return (
    <div className={styles.badgeWrap}>
      {showCombined && <BadgeChip kind="combined" variant={variant} />}
      {showEarly && <BadgeChip kind="early" variant={variant} />}
    </div>
  );
}
