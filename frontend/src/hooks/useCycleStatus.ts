import {
  CheckCircle, AlertTriangle, AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TOTAL_HOURS = 70;

export type Severity = 'ok' | 'warn' | 'danger';

export interface SeverityConfig {
  icon: LucideIcon;
  hintBg: string;
  remainingColour: string;
}

export const SEVERITY_CONFIG: Record<Severity, SeverityConfig> = {
  ok: {
    icon: CheckCircle,
    hintBg: 'bg-ev-fuel/10 text-ev-fuel border-ev-fuel/20',
    remainingColour: 'text-ev-fuel',
  },
  warn: {
    icon: AlertTriangle,
    hintBg: 'bg-ev-break/10 text-ev-break border-ev-break/20',
    remainingColour: 'text-ev-break',
  },
  danger: {
    icon: AlertCircle,
    hintBg: 'bg-red-500/10 text-red-400 border-red-500/20',
    remainingColour: 'text-red-400',
  },
};

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
