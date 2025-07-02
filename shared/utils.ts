/**
 * 🔧 Утилиты для оптимизации производительности и типизации
 */

import { BATCH_SIZES } from './constants';

/**
 * 🚀 Batch операции для оптимизации множественных операций
 */
export async function batchOperation<T>(
  items: T[],
  operation: (batch: T[]) => Promise<void>,
  batchSize: number = BATCH_SIZES.MEDIUM
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await operation(batch);
  }
}

/**
 * 📊 Преобразование строковых числовых полей в числа
 */
export function parseNumericFields<T extends Record<string, any>>(
  data: T,
  numericFields: (keyof T)[]
): T {
  const result = { ...data };
  
  for (const field of numericFields) {
    if (result[field] !== null && result[field] !== undefined) {
      const value = String(result[field]);
      if (value !== '') {
        result[field] = parseFloat(value) as any;
      }
    }
  }
  
  return result;
}

/**
 * 🔄 Адаптер для совместимости типов null/undefined
 */
export function adaptNullToUndefined<T extends Record<string, any>>(
  obj: T,
  fieldsToAdapt: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fieldsToAdapt) {
    if (result[field] === null) {
      result[field] = undefined as any;
    }
  }
  
  return result;
}

/**
 * 🎯 Debounce функция для оптимизации поиска
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * 📋 Утилита для глубокого клонирования объектов
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * 🔍 Утилита для безопасного доступа к вложенным свойствам
 */
export function safeGet<T>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}

/**
 * 📈 Утилита для форматирования чисел
 */
export const formatNumber = {
  currency: (value: number, currency = 'RUB'): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  },
  
  decimal: (value: number, fractionDigits = 2): string => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value);
  },
  
  percentage: (value: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }
};

/**
 * 📅 Утилиты для работы с датами
 */
export const dateUtils = {
  formatDate: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  },
  
  formatDateTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  },
  
  isToday: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }
};

/**
 * 🛡️ Утилита для валидации и очистки входных данных
 */
export const sanitize = {
  string: (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (value === null || value === undefined) return '';
    return String(value).trim();
  },
  
  number: (value: unknown): number | null => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  },
  
  boolean: (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'да'].includes(value.toLowerCase());
    }
    return Boolean(value);
  }
};

/**
 * 🎨 Утилиты для работы с CSS классами
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 📏 Утилита для ограничения текста
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}