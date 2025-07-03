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
    const supplierData = data as Record<string, unknown>;
    
    return insertSupplierSchema.parse({
      name: supplierData.name || supplierData.Название || "Без названия",
      website: String(supplierData.website || supplierData.Вебсайт || ""),
    });
  }
}

export const supplierService = new SupplierService();
