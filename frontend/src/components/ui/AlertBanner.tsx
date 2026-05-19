import { cn } from '../../lib/utils';

interface AlertBannerProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AlertBanner({ icon, children, className }: AlertBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3',
        className,
      )}
    >
      <span className="mt-0.5 shrink-0 text-red-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <p className="text-xs text-red-400">{children}</p>
    </div>
  );
}
