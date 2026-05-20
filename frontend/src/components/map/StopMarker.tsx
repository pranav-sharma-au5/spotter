import { Marker, Popup } from 'react-map-gl/maplibre';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { StopDetails } from '../shared/StopDetails';
import type { EventConfigEntry } from '../../config/eventConfig';
import type { ScheduledStop } from '../../types/trip';

interface StopMarkerProps {
  event: ScheduledStop;
  isActive: boolean;
  onClick?: (event: ScheduledStop) => void;
  onClose?: () => void;
}

interface StopPopupContentProps {
  config: EventConfigEntry;
  event: ScheduledStop;
  onClose?: () => void;
}

function StopPopupContent({ config, event, onClose }: StopPopupContentProps) {
  return (
    <div className="min-w-[160px] max-w-[240px] rounded-lg border border-border-subtle bg-bg-surface px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-[11px] font-semibold text-text-primary">{config.label}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 cursor-pointer border-none bg-transparent p-0 pl-1 text-[13px] leading-none text-text-muted"
        >
          ×
        </button>
      </div>
      <p className="mt-0.5 text-[10px] text-text-secondary">{event.location}</p>
      <StopDetails event={event} variant="popup" />
    </div>
  );
}

export function StopMarker({ event, isActive, onClick, onClose }: StopMarkerProps) {
  const config = EVENT_CONFIG[event.type];
  const isLarge = config.markerSize === 'lg';
  const size = isLarge ? 13 : 10;

  return (
    <>
      <Marker
        longitude={event.lng}
        latitude={event.lat}
        onClick={onClick ? () => onClick(event) : undefined}
      >
        <div
          className={onClick ? 'flex cursor-pointer flex-col items-center gap-0.5 transition-transform hover:scale-110' : 'flex flex-col items-center gap-0.5'}
        >
          <div
            className="pointer-events-none whitespace-nowrap rounded px-[5px] py-px text-[8px] font-bold leading-snug tracking-wide text-white shadow-sm"
            style={{ backgroundColor: config.colour }}
          >
            {config.label}
          </div>
          <div
            className="rounded-full border-2 border-white"
            style={{
              width: size,
              height: size,
              backgroundColor: config.colour,
              boxShadow: isActive ? `0 0 0 3px ${config.colour}40` : undefined,
            }}
          />
        </div>
      </Marker>

      {isActive && (
        <Popup
          longitude={event.lng}
          latitude={event.lat}
          anchor="bottom"
          closeButton={false}
          closeOnClick={false}
          onClose={onClose}
          style={{ padding: 0 }}
        >
          <StopPopupContent config={config} event={event} onClose={onClose} />
        </Popup>
      )}
    </>
  );
}
