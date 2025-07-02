import { dbLogger, getErrorMessage } from "@shared/logger";

/**
 * 🏗️ Базовый интерфейс для всех Storage операций
 * Унифицирует CRUD операции с логированием и обработкой ошибок
 */
export interface BaseStorageInterface<T, InsertT> {
  getAll(): Promise<T[]>;
  getById(id: number): Promise<T | undefined>;
  create(data: InsertT): Promise<T>;
  update(id: number, data: Partial<InsertT>): Promise<T | undefined>;
  delete(id: number): Promise<boolean>;
  deleteMultiple?(ids: number[]): Promise<boolean>;
}

/**
 * 🔧 Абстрактный базовый класс для Storage реализаций
 * Предоставляет общую логику для логирования и обработки ошибок
 */
export abstract class BaseStorage<T, InsertT> implements BaseStorageInterface<T, InsertT> {
  protected readonly entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  /**
   * Обертка для операций с автоматическим логированием
   */
  protected async executeWithLogging<R>(
    operationName: string,
    operation: () => Promise<R>
  ): Promise<R> {
    const endOperation = dbLogger.startOperation(`${operationName}${this.entityName}`);
    try {
      const result = await operation();
      endOperation();
      return result;
    } catch (error) {
      dbLogger.error(`Error in ${operationName}${this.entityName}`, {
        error: getErrorMessage(error),
      });
      endOperation();
      throw error;
    }
  }

  // Абстрактные методы, которые должны быть реализованы в наследниках
  abstract getAll(): Promise<T[]>;
  abstract getById(id: number): Promise<T | undefined>;
  abstract create(data: InsertT): Promise<T>;
  abstract update(id: number, data: Partial<InsertT>): Promise<T | undefined>;
  abstract delete(id: number): Promise<boolean>;

  /**
   * Опциональная реализация множественного удаления
   * Может быть переопределена в наследниках для оптимизации
   */
  async deleteMultiple(ids: number[]): Promise<boolean> {
    try {
      const results = await Promise.all(ids.map((id) => this.delete(id)));
      return results.every((result) => result === true);
    } catch (error) {
      dbLogger.error(`Error in deleteMultiple${this.entityName}`, {
        error: getErrorMessage(error),
        ids,
      });
      return false;
    }
  }
}

/**
 * 🎯 Типы для унификации ответов API
 */
export interface StorageOperationResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  pagination: Required<PaginationParams>;
}

/**
 * 📊 Утилиты для очистки данных
 */
export class DataCleaningUtils {
  /**
   * Очистка числовых значений от символов валюты и единиц измерения
   */
  static cleanNumericValue(value: string | null | undefined): string | null {
    if (!value || value === "") return null;

    const cleaned = String(value)
      .replace(/[^\d.,]/g, "") // Удаляем все кроме цифр, точек и запятых
      .replace(",", ".") // Заменяем запятые на точки
      .trim();

    return cleaned || null;
  }

  /**
   * Нормализация строковых значений
   */
  static cleanStringValue(value: string | null | undefined): string | null {
    if (!value || value === "") return null;
    return String(value).trim() || null;
  }

  /**
   * Валидация и очистка SKU
   */
  static cleanSKU(sku: string | null | undefined): string | null {
    if (!sku || sku === "") return null;
    return (
      String(sku)
        .toUpperCase()
        .replace(/[^A-Z0-9-_]/g, "")
        .trim() || null
    );
  }
}

/**
 * 🔒 Константы для операций
 */
export const STORAGE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  BATCH_SIZE: 100,
  CACHE_TTL: {
    SHORT: 60, // 1 минута для изменчивых данных
    MEDIUM: 300, // 5 минут для обычных данных
    LONG: 3600, // 1 час для статических данных
  },
} as const;
