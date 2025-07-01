import { db } from "../db";
import { products, inventory, reserves } from "@shared/schema";
import { sql } from "drizzle-orm";
import { materializedViewService } from "./materializedViewService";

export class InventoryService {
  private useMaterializedViews: boolean = true;

  /**
   * Переключение между материализованными представлениями и прямыми запросами
   */
  setUseMaterializedViews(use: boolean): void {
    this.useMaterializedViews = use;
    console.log(`📊 Режим материализованных представлений: ${use ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}`);
  }

  async getInventory(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number}>> {
    if (this.useMaterializedViews && !warehouseId) {
      return this.getInventoryFromMaterializedView();
    }
    
    return this.getInventoryFromDirectQuery(warehouseId);
  }

  /**
   * Получение остатков из материализованного представления (быстро)
   */
  private async getInventoryFromMaterializedView(): Promise<Array<{id: number; name: string; quantity: number}>> {
    try {
      const result = await materializedViewService.getInventorySummary();
      
      return result.map(row => ({
        id: row.id,
        name: row.name,
        quantity: parseFloat(row.total_quantity) || 0
      }));
    } catch (error) {
      console.error("[MATERIALIZED] Error, falling back to direct query:", error);
      return this.getInventoryFromDirectQuery();
    }
  }

  /**
   * Получение остатков прямым запросом (для складов или fallback)
   */
  private async getInventoryFromDirectQuery(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number}>> {
    console.log("[DB] Starting getInventory query...");
    const startTime = Date.now();
    
    try {
      const warehouseFilter = warehouseId ? sql`AND i.warehouse_id = ${warehouseId}` : sql``;
      
      const result = await db.execute(sql`
        SELECT 
          p.id,
          p.name,
          COALESCE(CAST(SUM(i.quantity) AS DECIMAL), 0) as quantity
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id ${warehouseFilter}
        GROUP BY p.id, p.name
        ORDER BY p.name
      `);
      
      const duration = Date.now() - startTime;
      console.log(`[DB] getInventory completed in ${duration}ms, returned ${result.rows.length} items`);
      
      return result.rows.map((row: any) => ({
        id: row.id as number,
        name: row.name as string,
        quantity: parseFloat(row.quantity as string) || 0
      }));
    } catch (error) {
      console.error("[DB] Error in getInventory:", error);
      throw error;
    }
  }

  async getInventoryAvailability(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number; reserved: number; available: number}>> {
    if (this.useMaterializedViews && !warehouseId) {
      return this.getInventoryAvailabilityFromMaterializedView();
    }
    
    return this.getInventoryAvailabilityFromDirectQuery(warehouseId);
  }

  /**
   * Получение доступных остатков из материализованного представления (быстро)
   */
  private async getInventoryAvailabilityFromMaterializedView(): Promise<Array<{id: number; name: string; quantity: number; reserved: number; available: number}>> {
    try {
      const result = await materializedViewService.getInventoryAvailability();
      
      return result.map(row => ({
        id: row.product_id,
        name: row.product_name,
        quantity: parseFloat(row.total_quantity) || 0,
        reserved: parseFloat(row.reserved_quantity) || 0,
        available: parseFloat(row.available_quantity) || 0
      }));
    } catch (error) {
      console.error("[MATERIALIZED] Error, falling back to direct query:", error);
      return this.getInventoryAvailabilityFromDirectQuery();
    }
  }

  /**
   * Получение доступных остатков прямым запросом (для складов или fallback)
   */
  private async getInventoryAvailabilityFromDirectQuery(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number; reserved: number; available: number}>> {
    console.log("[DB] Starting inventory availability query...");
    const startTime = Date.now();
    
    try {
      const warehouseFilter = warehouseId 
        ? sql`AND (i.warehouse_id = ${warehouseId} OR i.warehouse_id IS NULL) AND (r.warehouse_id = ${warehouseId} OR r.warehouse_id IS NULL)`
        : sql``;
      
      const result = await db.execute(sql`
        SELECT 
          p.id,
          p.name,
          COALESCE(CAST(SUM(i.quantity) AS DECIMAL), 0) as quantity,
          COALESCE(CAST(SUM(r.quantity) AS DECIMAL), 0) as reserved,
          COALESCE(CAST(SUM(i.quantity) AS DECIMAL), 0) - COALESCE(CAST(SUM(r.quantity) AS DECIMAL), 0) as available
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id ${warehouseFilter}
        LEFT JOIN reserves r ON p.id = r.product_id ${warehouseFilter}
        GROUP BY p.id, p.name
        ORDER BY p.name
      `);
      
      const duration = Date.now() - startTime;
      console.log(`[DB] Inventory availability completed in ${duration}ms, returned ${result.rows.length} items`);
      
      return result.rows.map((row: any) => ({
        id: row.id as number,
        name: row.name as string,
        quantity: parseFloat(row.quantity as string) || 0,
        reserved: parseFloat(row.reserved as string) || 0,
        available: parseFloat(row.available as string) || 0
      }));
    } catch (error) {
      console.error("[DB] Error in getInventoryAvailability:", error);
      throw error;
    }
  }

  /**
   * Получение статистики производительности
   */
  async getPerformanceStats(): Promise<{
    materialized_views_enabled: boolean;
    views_status: any[];
  }> {
    const viewsStatus = await materializedViewService.getViewsStatus();
    
    return {
      materialized_views_enabled: this.useMaterializedViews,
      views_status: viewsStatus
    };
  }

  /**
   * Принудительное обновление материализованных представлений
   */
  async refreshMaterializedViews(): Promise<void> {
    await materializedViewService.refreshAllViews();
  }
}

export const inventoryService = new InventoryService();