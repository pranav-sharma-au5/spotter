import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  children: React.ReactNode;
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:bg-bg-elevated disabled:text-text-muted',
  ghost:
    'rounded-full border border-border-subtle px-5 py-3 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary',
};

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button type="button" className={cn(VARIANTS[variant], className)} {...props}>
      {children}
    </button>
  );
}
