import { Check, X } from 'lucide-react';

export function AutoCheck({
  label,
  pass,
}: {
  label: string;
  pass: boolean | null;
}) {
  if (pass === null) return null;
  return (
    <li className="flex items-start gap-2 text-sm">
      {pass ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <span className={pass ? 'text-text-secondary' : 'text-text-primary'}>{label}</span>
    </li>
  );
}

export function ManualCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-text-secondary">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
