import {
  useState,
  useRef,
  useId,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { MapPin } from 'lucide-react';
import { useLocationAutocomplete } from '../../hooks/useLocationAutocomplete';
import type { LocationSuggestion } from '../../types/trip';

export interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  /** Disables the input element entirely (e.g. while GPS is acquiring position) */
  disabled?: boolean;
  rightSlot?: React.ReactNode;
}

export function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  disabled = false,
  rightSlot,
}: LocationAutocompleteProps) {
  const uid = useId();
  const listId = `suggestions-${uid}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  /**
   * Only fire autocomplete queries when the user has actively typed.
   * Starts false so that an externally-set value (GPS resolution, form
   * pre-fill) does not trigger a query. Resets to false after a selection
   * so subsequent programmatic value changes remain silent.
   */
  const [autocompleteActive, setAutocompleteActive] = useState(false);

  const { suggestions, isLoading } = useLocationAutocomplete({
    query: value,
    enabled: autocompleteActive && !disabled,
  });

  const showDropdown =
    isOpen && !disabled && value.length >= 3 && (isLoading || suggestions.length > 0 || autocompleteActive);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const closeDropdown = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    setAutocompleteActive(false); // silence queries until next user keystroke
    closeDropdown();
    onChange(suggestion.shortName);
    onSelect(suggestion);
    // Return focus to input so the user can continue navigating
    inputRef.current?.focus();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAutocompleteActive(true);
    setIsOpen(true);
    setActiveIndex(-1);
    onChange(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectSuggestion(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
      default:
        break;
    }
  };

  const handleFocus = () => {
    // Re-open if there are cached suggestions to show
    if (value.length >= 3 && suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay close to allow a mousedown on a suggestion to fire first.
    // Without the delay, blur fires before click and the dropdown disappears
    // before the option's onClick handler can run.
    blurTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, 150);
  };

  const handleOptionMouseDown = (suggestion: LocationSuggestion) => (
    e: React.MouseEvent,
  ) => {
    // Prevent blur from firing before this click is processed
    e.preventDefault();
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    selectSuggestion(suggestion);
  };

  return (
    <div ref={containerRef} className="relative">
      <p className="mb-0.5 text-[10px] font-medium tracking-wider text-text-muted">
        {label}
      </p>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={
            activeIndex >= 0 && suggestions[activeIndex]
              ? `suggestion-${suggestions[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-hint focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {rightSlot}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[220px] overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface shadow-lg"
        >
          {isLoading && value.length >= 3 ? (
            // Skeleton rows while fetching
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
                onMouseDown={handleOptionMouseDown(s)}
                onMouseEnter={() => setActiveIndex(idx)}
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
              No locations found for &ldquo;
              {value}
              &rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
