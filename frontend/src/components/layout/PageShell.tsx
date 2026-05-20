/**
 * Page layout convention: use PageShell + PageScrollContent (or stacked/split layout)
 * and named *Section components under components/<page>/ so page files stay scannable.
 */
import { cn } from '../../lib/utils';
import { Topbar } from './Topbar';

export type PageShellVariant = 'screen' | 'minHeight';
export type PageShellLayout = 'default' | 'stacked' | 'split';

interface PageShellProps {
  backTo?: string;
  backLabel?: string;
  variant?: PageShellVariant;
  layout?: PageShellLayout;
  children: React.ReactNode;
}

export function PageShell({
  backTo,
  backLabel,
  variant = 'screen',
  layout = 'default',
  children,
}: PageShellProps) {
  const heightClass = variant === 'minHeight' ? 'min-h-screen' : 'h-screen';

  const bodyClass =
    layout === 'stacked'
      ? 'flex min-h-0 flex-1 flex-col'
      : layout === 'split'
        ? 'relative flex min-h-0 flex-1'
        : undefined;

  return (
    <div className={cn('flex flex-col bg-bg-base', heightClass)}>
      <Topbar backTo={backTo} backLabel={backLabel} />
      {bodyClass ? <div className={bodyClass}>{children}</div> : children}
    </div>
  );
}
