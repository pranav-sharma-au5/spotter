import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  type MutableRefObject,
} from 'react';
import type { LocationSuggestion } from '../types/trip';

interface UseComboboxArgs {
  value: string;
  /**
   * A ref whose `.current` holds the latest suggestions array.  Using a ref
   * (instead of a state value) breaks the circular dependency between this hook
   * and the autocomplete query hook: the combobox exposes `autocompleteActive`
   * so the caller can gate the query, while the keyboard handler reads the ref
   * at event-time rather than at render-time.
   */
  suggestionsRef: MutableRefObject<LocationSuggestion[]>;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
}

export interface UseComboboxResult {
  isOpen: boolean;
  activeIndex: number;
  autocompleteActive: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handleOptionMouseDown: (suggestion: LocationSuggestion) => (e: React.MouseEvent) => void;
  setActiveIndex: (index: number) => void;
}

/**
 * Owns all combobox interaction: open/close state, keyboard navigation
 * (ArrowUp/Down/Enter/Escape), outside-click dismissal, and the blur/mousedown
 * timing workaround that prevents the dropdown from closing before a click
 * on a suggestion is processed.
 */
export function useCombobox({
  value,
  suggestionsRef,
  disabled = false,
  onChange,
  onSelect,
}: UseComboboxArgs): UseComboboxResult {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [autocompleteActive, setAutocompleteActive] = useState(false);

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
    setAutocompleteActive(false);
    closeDropdown();
    onChange(suggestion.shortName);
    onSelect(suggestion);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAutocompleteActive(true);
    setIsOpen(true);
    setActiveIndex(-1);
    onChange(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const suggestions = suggestionsRef.current;
    const showDropdown =
      isOpen && !disabled && value.length >= 3 && suggestions.length > 0;
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
    if (value.length >= 3 && suggestionsRef.current.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, 150);
  };

  const handleOptionMouseDown =
    (suggestion: LocationSuggestion) => (e: React.MouseEvent) => {
      e.preventDefault();
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      selectSuggestion(suggestion);
    };

  return {
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
  };
}
