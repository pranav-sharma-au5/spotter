import { Eyebrow } from '../ui/Eyebrow';
import { RoadIllustration } from '../input/RoadIllustration';

export function PlanInputHeroSection() {
  return (
    <div className="relative overflow-hidden border-b border-border-subtle bg-bg-surface py-8 md:py-10">
      <RoadIllustration />
      <div className="relative z-10 mx-auto max-w-xl px-4">
        <Eyebrow color="accent" className="mb-1">TRIP PLANNER</Eyebrow>
        <h1 className="text-2xl font-semibold text-text-primary">Where are you headed?</h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          We&apos;ll handle the rest stops, fuel, and HOS logs.
        </p>
      </div>
    </div>
  );
}
