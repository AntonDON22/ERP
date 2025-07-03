import { storage } from "../storage";
import { insertSupplierSchema, type InsertSupplier, type Supplier } from "../../shared/schema";
import { BaseService } from "./baseService";

export class SupplierService extends BaseService<Supplier, InsertSupplier> {
  protected entityName = "Supplier";
  protected storageKey = "getSuppliers" as const;

  protected async validateImportData(data: any): Promise<InsertSupplier> {
    return insertSupplierSchema.parse(data);
  }

  async create(data: InsertSupplier): Promise<Supplier> {
    const validatedData = insertSupplierSchema.parse(data);
    return await storage.createSupplier(validatedData);
  }

  async update(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const validatedData = insertSupplierSchema.partial().parse(data);
    return await storage.updateSupplier(id, validatedData);
  }
}

export const supplierService = new SupplierService();