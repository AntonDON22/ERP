import { storage } from "../storage";
import { insertWarehouseSchema, type InsertWarehouse, type Warehouse } from "../../shared/schema";

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
}

export const warehouseService = new WarehouseService();