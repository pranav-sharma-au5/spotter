import { Route, Clock, FileCheck } from 'lucide-react';
import { PageSection } from '../layout/PageSection';
import { ToolCard } from './ToolCard';

interface ToolsSectionProps {
  onPlanRoute: () => void;
}

const TOOLS = [
  {
    id: 'plan',
    icon: <Route className="h-5 w-5" />,
    title: 'Plan route',
    description: 'HOS-compliant trip planner with route map and log sheets',
    active: true,
  },
  {
    id: 'history',
    icon: <Clock className="h-5 w-5" />,
    title: 'Trip history',
    description: 'View past trips and logs',
    badge: 'Coming soon',
    active: false,
  },
  {
    id: 'compliance',
    icon: <FileCheck className="h-5 w-5" />,
    title: 'Compliance',
    description: 'HOS violation reports',
    badge: 'Coming soon',
    active: false,
  },
] as const;

export function ToolsSection({ onPlanRoute }: ToolsSectionProps) {
  return (
    <PageSection title="TOOLS">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <ToolCard
            key={tool.id}
            icon={tool.icon}
            title={tool.title}
            description={tool.description}
            badge={'badge' in tool ? tool.badge : undefined}
            active={tool.active}
            onClick={tool.active ? onPlanRoute : undefined}
          />
        ))}
      </div>
    </PageSection>
  );
}
