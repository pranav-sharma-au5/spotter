import { BADGE_CONFIG } from '../../../config/eventConfig';
import { getStopDetailsStyles } from './stopDetailsStyles';
import type { StopDetailsVariant } from './types';

type BadgeKind = keyof typeof BADGE_CONFIG;

interface BadgeChipProps {
  kind: BadgeKind;
  variant: StopDetailsVariant;
}

export function BadgeChip({ kind, variant }: BadgeChipProps) {
  const config = BADGE_CONFIG[kind];
  const styles = getStopDetailsStyles(variant);

  const backgroundColor = styles.badgeMutedBg
    ? `${config.colour}20`
    : config.colour;
  const color = styles.badgeMutedBg ? config.colour : undefined;

  return (
    <span className={styles.badge} style={{ backgroundColor, color }}>
      {config.label}
    </span>
  );
}
