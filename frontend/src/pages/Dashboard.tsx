import { useNavigate } from 'react-router-dom';
import { Route, Clock, FileCheck } from 'lucide-react';
import { Topbar } from '../components/layout/Topbar';

interface ToolCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}

function ToolCardItem({ icon, title, description, badge, active, onClick }: ToolCard) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!active}
      className={[
        'flex flex-col gap-3 rounded-xl border p-5 text-left transition-colors',
        active
          ? 'cursor-pointer border-border-subtle bg-bg-surface hover:border-border-medium hover:bg-bg-elevated'
          : 'cursor-default border-border-subtle bg-bg-surface opacity-60',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div className={active ? 'text-accent' : 'text-text-muted'}>{icon}</div>
        {badge && (
          <span className="rounded-full border border-border-medium px-2 py-px text-[10px] text-text-secondary">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${active ? 'text-text-primary' : 'text-text-muted'}`}>{title}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
      </div>
    </button>
  );
}

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col bg-bg-base">
      <Topbar />

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-text-primary">Good morning, John</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Cycle used:
              {' '}
              <span className="text-text-primary">0 hrs</span>
              {' '}
              —
              {' '}
              <span className="text-text-primary">70 hrs</span>
              {' '}
              remaining
            </p>
          </div>

          <p className="mb-3 text-[10px] font-semibold tracking-widest text-text-muted">TOOLS</p>

          <div className="grid grid-cols-3 gap-4">
            <ToolCardItem
              icon={<Route className="h-5 w-5" />}
              title="Plan route"
              description="HOS-compliant trip planner with route map and log sheets"
              active
              onClick={() => navigate('/plan')}
            />
            <ToolCardItem
              icon={<Clock className="h-5 w-5" />}
              title="Trip history"
              description="View past trips and logs"
              badge="Coming soon"
            />
            <ToolCardItem
              icon={<FileCheck className="h-5 w-5" />}
              title="Compliance"
              description="HOS violation reports"
              badge="Coming soon"
            />
          </div>

          <div className="mt-10 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/plan')}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
            >
              Plan a trip →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
