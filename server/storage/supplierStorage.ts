import { suppliers, type Supplier, type InsertSupplier } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { dbLogger } from "@shared/logger";

export class SupplierStorage {
  async getSuppliers(): Promise<Supplier[]> {
    dbLogger.debug("Starting getSuppliers query...");
    const startTime = Date.now();
    
    const result = await db.select().from(suppliers);
    
    const duration = Date.now() - startTime;
    dbLogger.debug(`getSuppliers completed in ${duration}ms, returned ${result.length} suppliers`);
    
    return result;
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db
      .insert(suppliers)
      .values(insertSupplier)
      .returning();
    return supplier;
  }

  async updateSupplier(id: number, updateData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [supplier] = await db
      .update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, id))
      .returning();
    return supplier || undefined;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db
      .delete(suppliers)
      .where(eq(suppliers.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}