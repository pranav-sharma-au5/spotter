import type { TripDay } from '../../types/trip';

export function getLogDate(dayIndex: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function calcTotalMiles(day: TripDay): number {
  return day.events.reduce((sum, e) => sum + (e.type === 'drive' ? e.miles_from_prev : 0), 0);
}

export function calcCumulativeTruckMiles(days: TripDay[], throughDayIndex: number): number {
  return days
    .slice(0, throughDayIndex + 1)
    .reduce((sum, d) => sum + calcTotalMiles(d), 0);
}

export function driverInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface EldHeaderField {
  label: string;
  value: string;
  y: number;
  col: 'left' | 'right';
}

export function buildEldHeaderFields(opts: {
  logDate: string;
  driverNo: string;
  carrierName: string;
  driverName: string;
  home: string;
  initials: string;
  vehicleNo: string;
  coDriver: string;
  trailerNo: string;
  shipperName: string;
  commodity: string;
  load: string;
  drivingMiles: number;
  truckMiles: number;
  from: string;
  to: string;
}): EldHeaderField[] {
  const {
    logDate, driverNo, carrierName, driverName, home, initials,
    vehicleNo, coDriver, trailerNo, shipperName, commodity, load,
    drivingMiles, truckMiles, from, to,
  } = opts;

  return [
    { label: 'Date (24-hr period):', value: logDate, y: 28, col: 'left' },
    { label: 'Driver No.:', value: driverNo, y: 28, col: 'right' },
    { label: 'Carrier:', value: carrierName, y: 40, col: 'left' },
    { label: 'Driver:', value: driverName, y: 40, col: 'right' },
    { label: 'Home op. center:', value: home, y: 52, col: 'left' },
    { label: 'Driver initials:', value: initials, y: 52, col: 'right' },
    { label: 'Tractor No.:', value: vehicleNo, y: 64, col: 'left' },
    { label: 'Co-Driver:', value: coDriver, y: 64, col: 'right' },
    { label: 'Trailer No.:', value: trailerNo, y: 76, col: 'left' },
    { label: 'Shipper:', value: shipperName, y: 76, col: 'right' },
    { label: 'Commodity:', value: commodity, y: 88, col: 'left' },
    { label: 'Load ID:', value: load, y: 88, col: 'right' },
    { label: 'Total miles (driving):', value: String(Math.round(drivingMiles)), y: 100, col: 'left' },
    { label: 'Total truck miles:', value: String(Math.round(truckMiles)), y: 100, col: 'right' },
    { label: 'From:', value: from, y: 112, col: 'left' },
    { label: 'To:', value: to, y: 112, col: 'right' },
  ];
}
