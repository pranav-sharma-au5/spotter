import { shouldShowOpeningHours } from './shouldShowOpeningHours';
import { getStopDetailsStyles } from './stopDetailsStyles';
import type { StopDetailsEventProps, StopDetailsVariant } from './types';

interface StopMetaRowsProps extends StopDetailsEventProps {
  variant: StopDetailsVariant;
}

export function StopMetaRows({ event, variant }: StopMetaRowsProps) {
  if (!event.stop_info) return null;

  const styles = getStopDetailsStyles(variant);
  const { stop_info: info } = event;
  const showWebsite = variant === 'popup' && info.website;

  return (
    <>
      {shouldShowOpeningHours(event) && (
        <p className={styles.metaRow}>
          <span className={styles.metaText}>🕐 {info.opening_hours}</span>
        </p>
      )}
      {info.phone && (
        <p className={styles.phoneRow}>
          <span className={styles.metaText}>📞 {info.phone}</span>
        </p>
      )}
      {showWebsite && (
        <a
          href={info.website}
          target="_blank"
          rel="noreferrer"
          className="m-0 text-[9px] text-accent no-underline"
        >
          🔗 Website
        </a>
      )}
    </>
  );
}
