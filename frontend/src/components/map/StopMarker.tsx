import { Marker, Popup } from 'react-map-gl/maplibre';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { formatHours } from '../../utils/format';
import type { ScheduledStop } from '../../types/trip';

interface StopMarkerProps {
  event: ScheduledStop;
  isActive: boolean;
  onClick?: (event: ScheduledStop) => void;
  onClose?: () => void;
}

export function StopMarker({
  event, isActive, onClick, onClose,
}: StopMarkerProps) {
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
          className={onClick ? 'cursor-pointer transition-transform hover:scale-110' : ''}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
        >
          {/* Coloured label chip — always visible for every stop type */}
          <div
            style={{
              backgroundColor: config.colour,
              color: '#fff',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '1px 5px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
              lineHeight: 1.5,
              pointerEvents: 'none',
            }}
          >
            {config.label}
          </div>

          {/* Dot */}
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: config.colour,
              border: '2px solid white',
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
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '8px 12px',
              minWidth: 160,
              maxWidth: 240,
            }}
          >
            {/* Header row: label + close button */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {config.label}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  padding: '0 0 0 4px',
                  cursor: 'pointer',
                  fontSize: 13,
                  lineHeight: 1,
                  color: 'var(--text-muted)',
                }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {event.location}
            </p>

            {event.stop_info && (
              <div style={{ marginTop: 5, borderTop: '1px solid var(--border-subtle)', paddingTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {event.stop_info.opening_hours && (
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>
                    🕐 {event.stop_info.opening_hours}
                  </p>
                )}
                {event.stop_info.phone && (
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>
                    📞 {event.stop_info.phone}
                  </p>
                )}
                {event.stop_info.website && (
                  <a
                    href={event.stop_info.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 9, color: 'var(--accent)', margin: 0, textDecoration: 'none' }}
                  >
                    🔗 Website
                  </a>
                )}
              </div>
            )}

            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {formatHours(event.duration_hrs)} stop
            </p>
            {event.satisfies.length > 1 && (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  fontSize: 9,
                  backgroundColor: '#63992220',
                  color: '#639922',
                  borderRadius: 4,
                  padding: '1px 5px',
                }}
              >
                combined stop
              </span>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}
