import { SelectableCard } from '../ui/SelectableCard';

export interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}

export function ToolCard({ icon, title, description, badge, active, onClick }: ToolCardProps) {
  return (
    <SelectableCard isActive={!!active} isDisabled={!active} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className={active ? 'text-accent' : 'text-text-muted'}>{icon}</div>
        {badge && (
          <span className="rounded-full border border-border-medium px-2 py-px text-[10px] text-text-secondary">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${active ? 'text-text-primary' : 'text-text-muted'}`}>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
      </div>
    </SelectableCard>
  );
}
