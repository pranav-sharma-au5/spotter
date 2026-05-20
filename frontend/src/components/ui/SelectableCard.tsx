interface SelectableCardProps {
  isActive: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectableCard({
  isActive,
  isDisabled = false,
  onClick,
  children,
  className = '',
}: SelectableCardProps) {
  const canInteract = isActive && !isDisabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canInteract}
      className={[
        'flex flex-col gap-3 rounded-xl border p-5 text-left transition-colors',
        canInteract
          ? 'cursor-pointer border-border-subtle bg-bg-surface hover:border-border-medium hover:bg-bg-elevated'
          : 'cursor-default border-border-subtle bg-bg-surface opacity-60',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
