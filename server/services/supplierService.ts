import { storage } from "../storage";
import { insertSupplierSchema, type InsertSupplier, type Supplier } from "../../shared/schema";
import { BaseService } from "./baseService";
// ✅ ИСПРАВЛЕНО: Добавлен отсутствующий apiLogger
import { apiLogger } from "../../shared/logger";

export class SupplierService extends BaseService<Supplier, InsertSupplier> {
  protected entityName = "Supplier";
  protected storageKey = "getSuppliers" as const;
  
  // ✅ ИСПРАВЛЕНО: Добавлены недостающие абстрактные свойства
  protected pluralName = "Suppliers";
  protected storageMethodPrefix = "Supplier";
  protected insertSchema = insertSupplierSchema;
  protected updateSchema = insertSupplierSchema.partial();

  // ✅ ИСПРАВЛЕНО: Типизация вместо any для валидации импорта
  protected async validateImportData(data: unknown): Promise<InsertSupplier> {
    return insertSupplierSchema.parse(data);
  }
  async getAll(): Promise<Supplier[]> {
    return await storage.getSuppliers();
  }

  async getById(id: number): Promise<Supplier | undefined> {
    return await storage.getSupplier(id);
  }

  async create(data: InsertSupplier): Promise<Supplier> {
    const validatedData = insertSupplierSchema.parse(data);
    return await storage.createSupplier(validatedData);
  }

  async update(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const validatedData = insertSupplierSchema.partial().parse(data);
    return await storage.updateSupplier(id, validatedData);
  }

  async delete(id: number): Promise<boolean> {
    return await storage.deleteSupplier(id);
  }

  async deleteMultiple(
    ids: number[]
  ): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID поставщиков для удаления");
    }

    const validIds = ids.filter((id) => Number.isInteger(id) && id > 0);
    if (validIds.length !== ids.length) {
      throw new Error("Некорректные ID поставщиков");
    }

    let deletedCount = 0;
    const results = [];

    for (const id of validIds) {
      try {
        const success = await storage.deleteSupplier(id);
        if (success) {
          deletedCount++;
          results.push({ id, status: "deleted" });
        } else {
          results.push({ id, status: "not_found" });
        }
      } catch (error) {
        apiLogger.error(`Error deleting supplier ${id}`, {
          supplierId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({ id, status: "error" });
        throw error;
      }
    }

    return { deletedCount, results };
  }

  // ✅ ИСПРАВЛЕНО: Типизация вместо any для импорта массива
  async import(suppliers: unknown[]): Promise<Supplier[]> {
    if (!Array.isArray(suppliers)) {
      throw new Error("Ожидается массив поставщиков");
    }

    const results = [];
    for (const supplierData of suppliers) {
      try {
        // ✅ ИСПРАВЛЕНО: Валидируем импортированные данные через схему
        const validatedData = await this.validateImportData(supplierData);
        
        // Получаем ID если есть для обновления
        const supplierRecord = supplierData as Record<string, unknown>;
        const id = supplierRecord.ID || supplierRecord.id;
        let supplier;

        if (id && Number.isInteger(Number(id))) {
          const numericId = Number(id);
          // Обновляем существующего поставщика
          supplier = await storage.updateSupplier(numericId, validatedData);
          if (!supplier) {
            // Если поставщик с таким ID не найден, создаем нового
            supplier = await storage.createSupplier(validatedData);
          }
        } else {
          // Создаем нового поставщика
          supplier = await storage.createSupplier(validatedData);
        }

        results.push(supplier);
      } catch (error) {
        apiLogger.error("Error importing supplier", {
          supplierData,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    return results;
  }
}

export const supplierService = new SupplierService();
