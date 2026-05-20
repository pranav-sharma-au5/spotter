export function RoadIllustration() {
  return (
    <svg
      viewBox="0 0 600 200"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path
        d="M300 200 L180 100 L140 0"
        stroke="var(--text-primary)"
        strokeWidth="80"
        fill="none"
        opacity="0.04"
        strokeLinecap="round"
      />
      <path
        d="M300 200 L420 100 L460 0"
        stroke="var(--text-primary)"
        strokeWidth="80"
        fill="none"
        opacity="0.04"
        strokeLinecap="round"
      />
      <path
        d="M300 200 L300 100 L300 0"
        stroke="var(--bg-surface)"
        strokeWidth="8"
        fill="none"
        opacity="0.06"
        strokeDasharray="20 15"
      />
    </svg>
  );
}
