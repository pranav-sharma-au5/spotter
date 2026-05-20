import { RouteSpine, type RouteField, type RouteValues } from '../input/RouteSpine';
import type { LocationSuggestion } from '../../types/trip';

interface RouteFormSectionProps {
  route: RouteValues;
  fieldErrors?: Partial<Record<RouteField, string>>;
  onChange: (field: RouteField, value: string) => void;
  onSelect: (field: RouteField, suggestion: LocationSuggestion) => void;
  onSwap: () => void;
}

export function RouteFormSection({
  route,
  fieldErrors,
  onChange,
  onSelect,
  onSwap,
}: RouteFormSectionProps) {
  return (
    <div className="overflow-visible rounded-xl border border-border-subtle bg-bg-surface">
      <RouteSpine
        values={route}
        fieldErrors={fieldErrors}
        onChange={onChange}
        onSelect={onSelect}
        onSwapPickupDropoff={onSwap}
      />
    </div>
  );
}
