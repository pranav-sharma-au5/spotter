import { cn } from '../../lib/utils';

type MaxWidth = 'xl' | '3xl' | 'none';

const MAX_WIDTH_CLASS: Record<Exclude<MaxWidth, 'none'>, string> = {
  xl: 'max-w-xl',
  '3xl': 'max-w-3xl',
};

interface PageScrollContentProps {
  maxWidth?: MaxWidth;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}

export function PageScrollContent({
  maxWidth = '3xl',
  className,
  innerClassName,
  children,
}: PageScrollContentProps) {
  return (
    <main className={cn('flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8', className)}>
      <div
        className={cn(
          'mx-auto',
          maxWidth !== 'none' && MAX_WIDTH_CLASS[maxWidth],
          innerClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}
