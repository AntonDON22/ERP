import { warehouses, type Warehouse, type InsertWarehouse } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { dbLogger } from "@shared/logger";

export class WarehouseStorage {
  async getWarehouses(): Promise<Warehouse[]> {
    dbLogger.debug("Starting getWarehouses query...");
    const startTime = Date.now();
    
    const result = await db.select().from(warehouses);
    
    const duration = Date.now() - startTime;
    dbLogger.debug(`getWarehouses completed in ${duration}ms, returned ${result.length} warehouses`);
    
    return result;
  }

  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
    return warehouse || undefined;
  }

  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    const [warehouse] = await db
      .insert(warehouses)
      .values(insertWarehouse)
      .returning();
    return warehouse;
  }

  async updateWarehouse(id: number, updateData: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const [warehouse] = await db
      .update(warehouses)
      .set(updateData)
      .where(eq(warehouses.id, id))
      .returning();
    return warehouse || undefined;
  }

  async deleteWarehouse(id: number): Promise<boolean> {
    const result = await db
      .delete(warehouses)
      .where(eq(warehouses.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}