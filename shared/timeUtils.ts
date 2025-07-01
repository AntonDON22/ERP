// Утилиты для работы с московским временем (UTC+3)

export const MOSCOW_TIMEZONE_OFFSET = 3; // часы от UTC

export function getMoscowTime(date?: Date): Date {
  const now = date || new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const moscowTime = new Date(utc + (MOSCOW_TIMEZONE_OFFSET * 3600000));
  return moscowTime;
}

export function formatMoscowTime(date?: Date): string {
  const moscowTime = getMoscowTime(date);
  return moscowTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Moscow'
  });
}

export function formatMoscowDate(date?: Date): string {
  const moscowTime = getMoscowTime(date);
  return moscowTime.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Moscow'
  });
}

export function formatMoscowDateTime(date?: Date): string {
  const moscowTime = getMoscowTime(date);
  const dateStr = moscowTime.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    timeZone: 'Europe/Moscow'
  });
  const timeStr = moscowTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Moscow'
  });
  return `${dateStr} ${timeStr}`;
}

export function getCurrentMoscowTimeString(): string {
  return formatMoscowTime();
}

export function getCurrentMoscowDateString(): string {
  return formatMoscowDate();
}

// Для генерации названий документов в формате YYYY-MM-DD
export function getMoscowDateForDocument(): string {
  const moscowTime = getMoscowTime();
  const year = moscowTime.getFullYear();
  const month = (moscowTime.getMonth() + 1).toString().padStart(2, '0');
  const day = moscowTime.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Для отображения даты в интерфейсе в формате день.месяц
export function getMoscowShortDate(): string {
  const moscowTime = getMoscowTime();
  const day = moscowTime.getDate().toString().padStart(2, '0');
  const month = (moscowTime.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}