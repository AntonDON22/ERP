// Утилиты для работы с московским временем (UTC+3)

export const MOSCOW_TIMEZONE_OFFSET = 3; // часы от UTC

export function getMoscowTime(date?: Date): Date {
  const now = date || new Date();
  // Используем правильную timezone conversion через Intl
  const moscowTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
  return moscowTime;
}

export function formatMoscowTime(date?: Date): string {
  const now = date || new Date();
  return now.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

export function formatMoscowDate(date?: Date): string {
  const now = date || new Date();
  return now.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
}

export function formatMoscowDateTime(date?: Date): string {
  const now = date || new Date();
  const dateStr = now.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
  const timeStr = now.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Moscow",
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
  const now = new Date();
  // Получаем дату в московском времени правильно
  const moscowDateStr = now.toLocaleDateString("en-CA", {
    timeZone: "Europe/Moscow",
  }); // en-CA дает формат YYYY-MM-DD
  return moscowDateStr;
}

// Для отображения даты в интерфейсе в формате день.месяц
export function getMoscowShortDate(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
  });
  return dateStr; // уже в формате DD.MM
}
