interface GreetingSectionProps {
  driverName?: string;
  cycleUsed?: number;
  cycleTotal?: number;
}

export function GreetingSection({
  driverName = 'Driver',
  cycleUsed = 0,
  cycleTotal = 70,
}: GreetingSectionProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-text-primary">
        Good morning, {driverName}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Cycle used:{' '}
        <span className="text-text-primary">{cycleUsed} hrs</span>
        {' '}—{' '}
        <span className="text-text-primary">{cycleTotal - cycleUsed} hrs</span>{' '}
        remaining
      </p>
    </div>
  );
}
