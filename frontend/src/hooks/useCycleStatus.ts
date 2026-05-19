const TOTAL_HOURS = 70;

type Severity = 'ok' | 'warn' | 'danger';

interface CycleStatus {
  remaining: number;
  severity: Severity;
  colour: string;
  hintMessage: string;
}

export function useCycleStatus(cycleUsedHrs: number): CycleStatus {
  const remaining = TOTAL_HOURS - cycleUsedHrs;

  let severity: Severity;
  let colour: string;
  let hintMessage: string;

  if (cycleUsedHrs <= 40) {
    severity = 'ok';
    colour = '#639922';
    hintMessage = 'Plenty of hours available.';
  } else if (cycleUsedHrs <= 58) {
    severity = 'warn';
    colour = '#EF9F27';
    hintMessage = `Getting low — ${remaining.toFixed(1)} hrs left. Short to mid-range trips only.`;
  } else if (cycleUsedHrs < 70) {
    severity = 'danger';
    colour = '#E24B4A';
    hintMessage = `Almost out — ${remaining.toFixed(1)} hrs left. Very limited range.`;
  } else {
    severity = 'danger';
    colour = '#E24B4A';
    hintMessage = 'No hours left. A 34-hr restart is needed before driving.';
  }

  return { remaining, severity, colour, hintMessage };
}
