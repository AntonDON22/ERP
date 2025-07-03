import { insertWarehouseSchema, type InsertWarehouse, type Warehouse } from "../../shared/schema";
import { BaseService } from "./baseService";

export class WarehouseService extends BaseService<Warehouse, InsertWarehouse> {
  protected entityName = "Warehouse";
  protected pluralName = "Warehouses";
  protected storageMethodPrefix = "Warehouse";
  protected insertSchema = insertWarehouseSchema;
  protected updateSchema = insertWarehouseSchema.partial();

  protected async validateImportData(data: unknown): Promise<InsertWarehouse> {
    const warehouseData = data as Record<string, unknown>;
    
    return insertWarehouseSchema.parse({
      name: warehouseData.name || warehouseData.Название || "Безымянный склад",
      address: String(warehouseData.address || warehouseData.Адрес || ""),
    });
  }
}

export const warehouseService = new WarehouseService();
