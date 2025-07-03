import { storage } from "../storage";
import { insertWarehouseSchema, type InsertWarehouse, type Warehouse } from "../../shared/schema";
import { apiLogger } from "../../shared/logger";

export class WarehouseService {
  async getAll(): Promise<Warehouse[]> {
    return await storage.getWarehouses();
  }

  async getById(id: number): Promise<Warehouse | undefined> {
    return await storage.getWarehouse(id);
  }

  async create(data: InsertWarehouse): Promise<Warehouse> {
    const validatedData = insertWarehouseSchema.parse(data);
    return await storage.createWarehouse(validatedData);
  }

  async update(id: number, data: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const validatedData = insertWarehouseSchema.partial().parse(data);
    return await storage.updateWarehouse(id, validatedData);
  }

  async delete(id: number): Promise<boolean> {
    return await storage.deleteWarehouse(id);
  }

  async deleteById(id: number): Promise<boolean> {
    return await storage.deleteWarehouse(id);
  }

  async deleteMultiple(
    ids: number[]
  ): Promise<{ deletedCount: number; results: Array<{ id: number; status: string }> }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Укажите массив ID складов для удаления");
    }

    const results: Array<{ id: number; status: string }> = [];
    let deletedCount = 0;

    for (const id of ids) {
      try {
        const deleted = await storage.deleteWarehouse(id);
        if (deleted) {
          deletedCount++;
          results.push({ id, status: "deleted" });
        } else {
          results.push({ id, status: "not_found" });
        }
      } catch (error) {
        apiLogger.error(`Error deleting warehouse ${id}`, {
          warehouseId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({ id, status: "error" });
        throw error;
      }
    }

    return { deletedCount, results };
  }

  async import(warehouses: any[]): Promise<Warehouse[]> {
    const results: Warehouse[] = [];

    for (const warehouseData of warehouses) {
      try {
        // Попытка обновить существующий склад (если есть ID)
        if (warehouseData.id) {
          const updatedWarehouse = await this.update(warehouseData.id, warehouseData);
          if (updatedWarehouse) {
            results.push(updatedWarehouse);
            continue;
          }
        }

        // Создание нового склада
        const warehouse = await this.create(warehouseData);
        results.push(warehouse);
      } catch (error) {
        apiLogger.error("Error importing warehouse", {
          warehouseData,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    return results;
  }
}

export const warehouseService = new WarehouseService();
