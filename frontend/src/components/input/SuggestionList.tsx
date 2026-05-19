import { MapPin } from 'lucide-react';
import type { LocationSuggestion } from '../../types/trip';

interface SuggestionListProps {
  listId: string;
  suggestions: LocationSuggestion[];
  isLoading: boolean;
  activeIndex: number;
  query: string;
  onMouseDown: (suggestion: LocationSuggestion) => (e: React.MouseEvent) => void;
  onMouseEnter: (index: number) => void;
}

export function SuggestionList({
  listId,
  suggestions,
  isLoading,
  activeIndex,
  query,
  onMouseDown,
  onMouseEnter,
}: SuggestionListProps) {
  return (
    <ul
      id={listId}
      role="listbox"
      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[220px] overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface shadow-lg"
    >
      {isLoading ? (
        [0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-bg-elevated" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-3/4 animate-pulse rounded bg-bg-elevated" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-bg-elevated" />
            </div>
          </li>
        ))
      ) : suggestions.length > 0 ? (
        suggestions.map((s, idx) => (
          <li
            key={s.id}
            id={`suggestion-${s.id}`}
            role="option"
            aria-selected={idx === activeIndex}
            onMouseDown={onMouseDown(s)}
            onMouseEnter={() => onMouseEnter(idx)}
            className={[
              'flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors',
              idx === activeIndex ? 'bg-bg-highlight' : 'hover:bg-bg-highlight',
            ].join(' ')}
          >
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-text-primary">{s.shortName}</p>
              <p className="truncate text-[11px] text-text-muted">{s.displayName}</p>
            </div>
          </li>
        ))
      ) : (
        <li className="px-3 py-3 text-center text-xs text-text-muted">
          No locations found for &ldquo;{query}&rdquo;
        </li>
      )}
    </ul>
  );
}
