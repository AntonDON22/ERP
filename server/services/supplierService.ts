import { storage } from "../storage";
import { insertSupplierSchema, type InsertSupplier, type Supplier } from "../../shared/schema";
import { apiLogger } from "../../shared/logger";

export class SupplierService {
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

  async deleteMultiple(ids: number[]): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID поставщиков для удаления");
    }

    const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
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
          results.push({ id, status: 'deleted' });
        } else {
          results.push({ id, status: 'not_found' });
        }
      } catch (error) {
        apiLogger.error(`Error deleting supplier ${id}`, { supplierId: id, error: error instanceof Error ? error.message : String(error) });
        results.push({ id, status: 'error' });
      }
    }

    return { deletedCount, results };
  }

  async import(suppliers: any[]): Promise<Supplier[]> {
    if (!Array.isArray(suppliers)) {
      throw new Error("Ожидается массив поставщиков");
    }

    const results = [];
    for (const supplierData of suppliers) {
      try {
        const validatedData = {
          name: supplierData.name || supplierData.Название || "Без названия",
          website: String(supplierData.website || supplierData.Вебсайт || ""),
        };
        
        // Проверяем наличие ID для обновления
        const id = supplierData.ID || supplierData.id;
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
        apiLogger.error('Error importing supplier', { supplierData, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return results;
  }
}

export const supplierService = new SupplierService();