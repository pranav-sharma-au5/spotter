import { CycleGauge } from '../input/CycleGauge';

interface CycleSectionProps {
  value: number;
  onChange: (value: number) => void;
}

export function CycleSection({ value, onChange }: CycleSectionProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
      <CycleGauge value={value} onChange={onChange} />
    </div>
  );
}
