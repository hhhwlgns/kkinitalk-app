export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
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

export function formatKoreanTime(hhmm: string): string {
  const [hourStr, minuteStr] = hhmm.split(':');
  const hour24 = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour24 < 12 ? '오전' : '오후';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${period} ${hour12}시` : `${period} ${hour12}시 ${minute}분`;
}
