import { cn } from '../../lib/utils';

interface EyebrowProps {
  color?: 'accent' | 'muted';
  className?: string;
  children: React.ReactNode;
}

export function Eyebrow({ color = 'muted', className, children }: EyebrowProps) {
  return (
    <p
      className={cn(
        'text-[10px] font-semibold tracking-widest',
        color === 'accent' ? 'text-accent' : 'text-text-muted',
        className,
      )}
    >
      {children}
    </p>
  );
}
