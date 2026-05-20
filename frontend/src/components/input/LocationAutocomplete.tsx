import { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useLocationAutocomplete } from '../../hooks/useLocationAutocomplete';
import { useCombobox } from '../../hooks/useCombobox';
import { SuggestionList } from './SuggestionList';
import type { LocationSuggestion } from '../../types/trip';

export interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  /** Disables the input element entirely (e.g. while GPS is acquiring position) */
  disabled?: boolean;
  /** Show a clear button when the field has a value */
  clearable?: boolean;
  rightSlot?: React.ReactNode;
  /** Optional inline error message shown beneath the input */
  error?: string;
}

export function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  disabled = false,
  clearable = true,
  rightSlot,
  error,
}: LocationAutocompleteProps) {
  const uid = useId();
  const listId = `suggestions-${uid}`;

  // A ref whose .current is kept in sync with the latest suggestions array.
  // This breaks the circular dependency: useCombobox exposes autocompleteActive
  // (used to gate the query), while the keyboard handler reads suggestions at
  // event-time via the ref instead of at render-time.
  const suggestionsRef = useRef<LocationSuggestion[]>([]);

  const {
    isOpen,
    activeIndex,
    autocompleteActive,
    inputRef,
    containerRef,
    handleInputChange,
    handleKeyDown,
    handleFocus,
    handleBlur,
    handleOptionMouseDown,
    setActiveIndex,
  } = useCombobox({ value, suggestionsRef, disabled, onChange, onSelect });

  const { suggestions, isLoading } = useLocationAutocomplete({
    query: value,
    enabled: autocompleteActive && !disabled,
  });

  // Keep the ref in sync so the keyboard handler always sees fresh suggestions.
  suggestionsRef.current = suggestions;

  const showDropdown =
    isOpen &&
    !disabled &&
    value.length >= 3 &&
    (isLoading || suggestions.length > 0 || autocompleteActive);

  const showClear = clearable && !disabled && value.length > 0;

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
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
          className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-hint focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {showClear && (
          <button
            type="button"
            aria-label="Clear location"
            onClick={handleClear}
            className="shrink-0 rounded-full p-1 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {rightSlot}
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-red-400">{error}</p>
      )}

      {showDropdown && (
        <SuggestionList
          listId={listId}
          suggestions={suggestions}
          isLoading={isLoading && value.length >= 3}
          activeIndex={activeIndex}
          query={value}
          onMouseDown={handleOptionMouseDown}
          onMouseEnter={setActiveIndex}
        />
      )}
    </div>
  );
}
