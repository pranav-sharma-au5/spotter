import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  backTo?: string;
  backLabel?: string;
}

export function Topbar({ backTo, backLabel }: TopbarProps) {
  const navigate = useNavigate();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface px-4">
      <div className="flex w-28 items-center">
        {backTo && (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel ?? 'Back'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold tracking-tight text-text-primary">FreightOS</span>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      </div>

      <div className="flex w-28 items-center justify-end">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
          JD
        </div>
      </div>
    </header>
  );
}
