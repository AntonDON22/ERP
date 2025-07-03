import { apiLogger } from "@shared/logger";
import { storage } from "../storage";

/**
 * 🏗️ BaseService - базовый сервис для CRUD операций
 * 
 * Унифицирует общую логику работы с данными для всех сервисов
 * Устраняет дублирование кода в supplierService, contractorService, warehouseService
 */
export abstract class BaseService<T, InsertT> {
  protected abstract entityName: string;
  protected abstract storageKey: keyof typeof storage;

  /**
   * Получить все записи
   */
  async getAll(): Promise<T[]> {
    return await (storage[this.storageKey] as any).call(storage);
  }

  /**
   * Получить запись по ID
   */
  async getById(id: number): Promise<T | undefined> {
    const methodName = `get${this.entityName}`;
    return await (storage as any)[methodName](id);
  }

  /**
   * Создать новую запись
   */
  async create(data: InsertT): Promise<T> {
    const methodName = `create${this.entityName}`;
    return await (storage as any)[methodName](data);
  }

  /**
   * Обновить запись
   */
  async update(id: number, data: Partial<InsertT>): Promise<T | undefined> {
    const methodName = `update${this.entityName}`;
    return await (storage as any)[methodName](id, data);
  }

  /**
   * Удалить запись
   */
  async delete(id: number): Promise<boolean> {
    const methodName = `delete${this.entityName}`;
    return await (storage as any)[methodName](id);
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
  async import(items: any[]): Promise<T[]> {
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
   * Валидация данных для импорта (должна быть реализована в наследниках)
   */
  protected abstract validateImportData(data: any): Promise<InsertT>;
}