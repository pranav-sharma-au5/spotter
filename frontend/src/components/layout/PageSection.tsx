import { cn } from '../../lib/utils';
import { Eyebrow } from '../ui/Eyebrow';

interface PageSectionProps {
  title?: string;
  eyebrowColor?: 'accent' | 'muted';
  spacing?: 'default' | 'large' | 'none';
  className?: string;
  children: React.ReactNode;
}

const SPACING_CLASS = {
  none: '',
  default: 'mt-6',
  large: 'mt-10',
} as const;

export function PageSection({
  title,
  eyebrowColor = 'muted',
  spacing = 'none',
  className,
  children,
}: PageSectionProps) {
  return (
    <section className={cn(SPACING_CLASS[spacing], className)}>
      {title && (
        <Eyebrow color={eyebrowColor} className="mb-3">
          {title}
        </Eyebrow>
      )}
      {children}
    </section>
  );
}
