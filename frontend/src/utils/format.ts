export function formatHours(hrs: number): string {
  const totalMins = Math.round(hrs * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m} mins`;
  if (m === 0) return `${h} hrs`;
  return `${h} hrs ${m} mins`;
}

export function formatMiles(miles: number): string {
  return miles.toLocaleString();
}

export function formatTime(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h < 12 ? 'am' : 'pm';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function addHoursToTime(timeStr: string, hours: number): string {
  const [hStr, mStr] = timeStr.split(':');
  const startMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  const endMinutes = startMinutes + hours * 60;
  return formatTime(endMinutes / 60);
}
