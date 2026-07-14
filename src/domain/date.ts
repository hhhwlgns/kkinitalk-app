// All day-boundary logic uses the device's local calendar date. Slicing an ISO
// string gives the UTC date, which is *yesterday* between 00:00–09:00 KST —
// morning check-ins and breakfasts were landing on the wrong day.
export function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayDate(): string {
  return localDateString(new Date());
}

export function isoToLocalDate(iso: string): string {
  return localDateString(new Date(iso));
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateWithWeekday(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${month}월 ${day}일 ${weekday}요일`;
}

export function earliestTime(times: string[]): string {
  return [...times].sort()[0];
}

// Non-breaking spaces keep "오후 12시 30분" from wrapping mid-phrase in narrow labels.
function formatKoreanTimeParts(hour24: number, minute: number): string {
  const period = hour24 < 12 ? '오전' : '오후';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${period} ${hour12}시` : `${period} ${hour12}시 ${minute}분`;
}

export function formatKoreanTime(hhmm: string): string {
  const [hourStr, minuteStr] = hhmm.split(':');
  return formatKoreanTimeParts(Number(hourStr), Number(minuteStr));
}

export function formatIsoTime(iso: string): string {
  const date = new Date(iso);
  return formatKoreanTimeParts(date.getHours(), date.getMinutes());
}
