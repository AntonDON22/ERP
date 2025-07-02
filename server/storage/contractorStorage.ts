import { contractors, type Contractor, type InsertContractor } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { dbLogger } from "@shared/logger";

export class ContractorStorage {
  async getContractors(): Promise<Contractor[]> {
    dbLogger.debug("Starting getContractors query...");
    const startTime = Date.now();
    
    const result = await db.select().from(contractors);
    
    const duration = Date.now() - startTime;
    dbLogger.debug(`getContractors completed in ${duration}ms, returned ${result.length} contractors`);
    
    return result;
  }

  async getContractor(id: number): Promise<Contractor | undefined> {
    const [contractor] = await db.select().from(contractors).where(eq(contractors.id, id));
    return contractor || undefined;
  }

  async createContractor(insertContractor: InsertContractor): Promise<Contractor> {
    const [contractor] = await db
      .insert(contractors)
      .values(insertContractor)
      .returning();
    return contractor;
  }

  async updateContractor(id: number, updateData: Partial<InsertContractor>): Promise<Contractor | undefined> {
    const [contractor] = await db
      .update(contractors)
      .set(updateData)
      .where(eq(contractors.id, id))
      .returning();
    return contractor || undefined;
  }

  async deleteContractor(id: number): Promise<boolean> {
    const result = await db
      .delete(contractors)
      .where(eq(contractors.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}