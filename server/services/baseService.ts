import { apiLogger } from "@shared/logger";
import { storage } from "../storage";
import { z } from "zod";

/**
 * 🏗️ BaseService - типизированный базовый сервис для CRUD операций
 * 
 * Унифицирует общую логику работы с данными для всех сервисов
 * Обеспечивает type safety и стандартизированную обработку ошибок
 * 
 * @template T - Тип сущности (Supplier, Contractor, Warehouse)
 * @template InsertT - Тип данных для создания (InsertSupplier, etc.)
 * @template UpdateT - Тип данных для обновления (по умолчанию Partial<InsertT>)
 */
export abstract class BaseService<T, InsertT, UpdateT = Partial<InsertT>> {
  protected abstract entityName: string;
  protected abstract pluralName: string;
  protected abstract storageMethodPrefix: string;
  
  // Схемы валидации должны быть определены в наследниках
  protected abstract insertSchema: z.ZodSchema<InsertT>;
  protected abstract updateSchema: z.ZodSchema<UpdateT>;

  // Добавляем ссылку на storage для консистентности с OrderService
  protected storage = storage;

  /**
   * 📋 Получить все записи с типизацией
   */
  async getAll(): Promise<T[]> {
    try {
      const methodName = `get${this.pluralName}`;
      // ✅ ИСПРАВЛЕНО: Типизация вместо any с безопасным casting
      const result = await (storage as unknown as Record<string, () => Promise<T[]>>)[methodName]();
      
      apiLogger.info(`Retrieved all ${this.pluralName.toLowerCase()}`, {
        count: result?.length || 0,
        entity: this.entityName,
      });
      
      return result || [];
    } catch (error) {
      apiLogger.error(`Error getting all ${this.pluralName.toLowerCase()}`, {
        entity: this.entityName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 🔍 Получить запись по ID с валидацией
   */
  async getById(id: number): Promise<T | undefined> {
    try {
      this.validateId(id);
      
      const methodName = `get${this.entityName}`;
      // ✅ ИСПРАВЛЕНО: Типизация вместо any для getById с безопасным casting
      const result = await (storage as unknown as Record<string, (id: number) => Promise<T | undefined>>)[methodName](id);
      
      apiLogger.debug(`Retrieved ${this.entityName.toLowerCase()} by ID`, {
        id,
        found: !!result,
        entity: this.entityName,
      });
      
      return result;
    } catch (error) {
      apiLogger.error(`Error getting ${this.entityName.toLowerCase()} by ID`, {
        id,
        entity: this.entityName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * ✅ Создать новую запись с валидацией
   */
  async create(data: InsertT): Promise<T> {
    try {
      const validatedData = this.insertSchema.parse(data);
      
      const methodName = `create${this.entityName}`;
      // ✅ ИСПРАВЛЕНО: Типизация вместо any для create с безопасным casting
      const result = await (storage as unknown as Record<string, (data: InsertT) => Promise<T>>)[methodName](validatedData);
      
      apiLogger.info(`Created new ${this.entityName.toLowerCase()}`, {
        id: (result as { id?: number })?.id,
        entity: this.entityName,
      });
      
      return result;
    } catch (error) {
      apiLogger.error(`Error creating ${this.entityName.toLowerCase()}`, {
        data,
        entity: this.entityName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 🔄 Обновить запись с валидацией
   */
  async update(id: number, data: UpdateT): Promise<T | undefined> {
    try {
      this.validateId(id);
      const validatedData = this.updateSchema.parse(data);
      
      const methodName = `update${this.entityName}`;
      // ✅ ИСПРАВЛЕНО: Типизация вместо any для update с безопасным casting
      const result = await (storage as unknown as Record<string, (id: number, data: UpdateT) => Promise<T | undefined>>)[methodName](id, validatedData);
      
      if (!result) {
        apiLogger.warn(`${this.entityName} not found for update`, {
          id,
          entity: this.entityName,
        });
        return undefined;
      }
      
      apiLogger.info(`Updated ${this.entityName.toLowerCase()}`, {
        id,
        entity: this.entityName,
      });
      
      return result;
    } catch (error) {
      apiLogger.error(`Error updating ${this.entityName.toLowerCase()}`, {
        id,
        data,
        entity: this.entityName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 📊 Получить общее количество записей
   */
  async getCount(): Promise<number> {
    try {
      const allRecords = await this.getAll();
      return allRecords.length;
    } catch (error) {
      apiLogger.error(`Error getting ${this.entityName.toLowerCase()} count`, {
        entity: this.entityName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 📄 Получить записи с пагинацией
   */
  async getAllPaginated(params: any): Promise<T[]> {
    try {
      // Получаем все записи через BaseService
      const allRecords = await this.getAll();

      // Применяем сортировку
      const sortedRecords = this.sortRecords(
        allRecords,
        params.sort || 'id',
        params.order || 'asc'
      );

      // Применяем пагинацию в памяти
      const startIndex = params.offset || 0;
      const endIndex = startIndex + (params.limit || 20);
      const data = sortedRecords.slice(startIndex, endIndex);

      return data;
    } catch (error) {
      apiLogger.error(`Error getting paginated ${this.entityName.toLowerCase()}`, {
        entity: this.entityName,
        params,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 🔄 Сортировка записей
   */
  protected sortRecords(records: T[], sortField: string, order: 'asc' | 'desc'): T[] {
    return records.sort((a, b) => {
      const aValue = (a as any)[sortField];
      const bValue = (b as any)[sortField];
      
      // Обработка null/undefined значений
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return order === 'asc' ? 1 : -1;
      if (bValue == null) return order === 'asc' ? -1 : 1;
      
      // Сравнение значений
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }



  /**
   * 🗑️ Удалить запись с проверкой существования
   */
  async delete(id: number): Promise<boolean> {
    try {
      this.validateId(id);
      
      // Проверка существования перед удалением
      const existing = await this.getById(id);
      if (!existing) {
        apiLogger.warn(`${this.entityName} not found for deletion`, {
          id,
          entity: this.entityName,
        });
        return false;
      }
      
      const methodName = `delete${this.entityName}`;
      // ✅ ИСПРАВЛЕНО: Типизация вместо any для delete с безопасным casting
      const result = await (storage as unknown as Record<string, (id: number) => Promise<boolean>>)[methodName](id);
      
      if (result) {
        apiLogger.info(`Deleted ${this.entityName.toLowerCase()}`, {
          id,
          entity: this.entityName,
        });
      }
      
      return result;
    } catch (error) {
      apiLogger.error(`Error deleting ${this.entityName.toLowerCase()}`, {
        id,
        entity: this.entityName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Удалить запись по ID (альтернативный метод)
   */
  async deleteById(id: number): Promise<boolean> {
    return await this.delete(id);
  }

  /**
   * Множественное удаление записей
   */
  async deleteMultiple(ids: number[]): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    let deletedCount = 0;
    const results: Array<{ id: number; status: string }> = [];

    for (const id of ids) {
      try {
        const success = await this.delete(id);
        if (success) {
          deletedCount++;
          results.push({ id, status: "deleted" });
        } else {
          results.push({ id, status: "not_found" });
        }
      } catch (error) {
        apiLogger.error(`Error deleting ${this.entityName.toLowerCase()} ${id}`, {
          [`${this.entityName.toLowerCase()}Id`]: id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({ id, status: "error" });
        throw error;
      }
    }

    return { deletedCount, results };
  }

  /**
   * Импорт данных
   */
  // ✅ ИСПРАВЛЕНО: Типизация вместо any для import массива
  async import(items: unknown[]): Promise<T[]> {
    if (!Array.isArray(items)) {
      throw new Error(`Expected array for ${this.entityName.toLowerCase()} import`);
    }

    const results: T[] = [];

    for (const itemData of items) {
      try {
        // Валидация данных (должна быть реализована в наследниках)
        const validatedData = await this.validateImportData(itemData);
        
        // Создание новой записи
        const item = await this.create(validatedData);
        results.push(item);
      } catch (error) {
        apiLogger.error(`Error importing ${this.entityName.toLowerCase()}`, {
          [`${this.entityName.toLowerCase()}Data`]: itemData,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    return results;
  }

  /**
   * 🔧 Валидация ID параметров
   */
  protected validateId(id: number): void {
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new Error(`Invalid ID: ${id}. ID must be a positive integer.`);
    }
    
    if (id > 2147483647) {
      throw new Error(`ID too large: ${id}. Maximum value is 2147483647.`);
    }
  }

  /**
   * 🔧 Валидация массива ID для batch операций
   */
  protected validateIds(ids: number[]): void {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("IDs array must be non-empty array");
    }
    
    if (ids.length > 100) {
      throw new Error("Too many IDs. Maximum 100 items per batch operation");
    }
    
    for (const id of ids) {
      this.validateId(id);
    }
  }

  /**
   * 📊 Получить статистику операций (для мониторинга)
   */
  protected getOperationStats(operation: string, startTime: number, success: boolean): object {
    return {
      entity: this.entityName,
      operation,
      duration: Date.now() - startTime,
      success,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🎯 Стандартизированная обработка ошибок
   */
  protected handleError(operation: string, error: unknown, context: object = {}): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    apiLogger.error(`${this.entityName} ${operation} failed`, {
      entity: this.entityName,
      operation,
      error: errorMessage,
      ...context,
    });
    
    // Перебрасываем ошибку для правильного HTTP статуса
    throw error;
  }

  /**
   * 📦 Валидация данных для импорта (должна быть реализована в наследниках)
   */
  // ✅ ИСПРАВЛЕНО: Типизация вместо any для abstract метода валидации
  protected abstract validateImportData(data: unknown): Promise<InsertT>;
}