import { db, pool } from "../db";
import { products, inventory, reserves } from "@shared/schema";
import { sql } from "drizzle-orm";
import { materializedViewService } from "./materializedViewService";
import { logger } from "../../shared/logger";

export class InventoryService {
  private useMaterializedViews: boolean = true;

  /**
   * Переключение между материализованными представлениями и прямыми запросами
   */
  setUseMaterializedViews(use: boolean): void {
    this.useMaterializedViews = use;
    // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
    logger.info(`📊 Режим материализованных представлений: ${use ? "ВКЛЮЧЕН" : "ВЫКЛЮЧЕН"}`);
  }

  async getInventory(
    warehouseId?: number
  ): Promise<Array<{ id: number; name: string; quantity: number }>> {
    if (this.useMaterializedViews && !warehouseId) {
      return this.getInventoryFromMaterializedView();
    }

    return this.getInventoryFromDirectQuery(warehouseId);
  }

  /**
   * Получение остатков из материализованного представления (быстро)
   */
  private async getInventoryFromMaterializedView(): Promise<
    Array<{ id: number; name: string; quantity: number }>
  > {
    try {
      const result = await materializedViewService.getInventorySummary();

      // Данные уже нормализованы MaterializedViewService
      return result.map((row) => ({
        id: row.id,
        name: row.name,
        quantity: row.quantity,
      }));
    } catch (error) {
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.error
      logger.error("[MATERIALIZED] Error, falling back to direct query:", { error });
      return this.getInventoryFromDirectQuery();
    }
  }

  /**
   * Получение остатков прямым запросом (для складов или fallback)
   */
  private async getInventoryFromDirectQuery(
    warehouseId?: number
  ): Promise<Array<{ id: number; name: string; quantity: number }>> {
    // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
    logger.info("[DB] Starting getInventory query...");
    const startTime = Date.now();

    try {
      const warehouseFilter = warehouseId ? sql`AND i.warehouse_id = ${warehouseId}` : sql``;

      const result = await db.execute(sql`
        SELECT 
          p.id,
          p.name,
          COALESCE(CAST(SUM(CASE WHEN d.status = 'posted' THEN i.quantity ELSE 0 END) AS DECIMAL), 0) as quantity
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id
        LEFT JOIN documents d ON i.document_id = d.id
        WHERE (d.status = 'posted' OR d.status IS NULL) ${warehouseFilter}
        GROUP BY p.id, p.name
        ORDER BY p.name
      `);

      const duration = Date.now() - startTime;
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log  
      logger.debug("getInventory completed", {
        duration: `${duration}ms`,
        rowCount: result.rows.length,
        service: "inventory"
      });

      // ✅ ИСПРАВЛЕНО: Типизация вместо any для SQL результатов
      return result.rows.map((row: Record<string, unknown>) => ({
        id: row.id as number,
        name: row.name as string,
        quantity: parseFloat(row.quantity as string) || 0,
      }));
    } catch (error) {
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.error
      logger.error("Error in getInventory", { 
        error: (error as Error).message,
        service: "inventory"
      });
      throw error;
    }
  }

  async getInventoryAvailability(
    warehouseId?: number
  ): Promise<
    Array<{ id: number; name: string; quantity: number; reserved: number; available: number }>
  > {
    if (this.useMaterializedViews && !warehouseId) {
      return this.getInventoryAvailabilityFromMaterializedView();
    }

    return this.getInventoryAvailabilityFromDirectQuery(warehouseId);
  }

  /**
   * Получение доступных остатков из материализованного представления (быстро)
   */
  private async getInventoryAvailabilityFromMaterializedView(): Promise<
    Array<{ id: number; name: string; quantity: number; reserved: number; available: number }>
  > {
    try {
      const result = await materializedViewService.getInventoryAvailability();

      // Данные уже нормализованы MaterializedViewService, просто возвращаем их
      return result.map((row) => ({
        id: row.id,
        name: row.name,
        quantity: row.quantity,
        reserved: row.reserved || 0,
        available: row.available || 0,
      }));
    } catch (error) {
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.error
      logger.warn("Materialized view error, falling back to direct query", {
        error: (error as Error).message,
        service: "inventory"
      });
      return this.getInventoryAvailabilityFromDirectQuery();
    }
  }

  /**
   * Получение доступных остатков прямым запросом (для складов или fallback)
   */
  private async getInventoryAvailabilityFromDirectQuery(
    warehouseId?: number
  ): Promise<
    Array<{ id: number; name: string; quantity: number; reserved: number; available: number }>
  > {
    // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
    logger.debug("Starting inventory availability query", { service: "inventory" });
    const startTime = Date.now();

    try {
      // Используем pool для прямого SQL запроса с параметрами
      let result;

      if (warehouseId) {
        const queryText = `
          SELECT 
            p.id,
            p.name,
            COALESCE(warehouse_qty.quantity, 0) as quantity,
            COALESCE(warehouse_reserved.reserved, 0) as reserved,
            COALESCE(warehouse_qty.quantity, 0) - COALESCE(warehouse_reserved.reserved, 0) as available
          FROM products p
          LEFT JOIN (
            SELECT 
              i.product_id,
              CAST(SUM(i.quantity) AS DECIMAL) as quantity
            FROM inventory i
            JOIN documents d ON i.document_id = d.id
            WHERE d.status = 'posted' AND d.warehouse_id = $1
            GROUP BY i.product_id
          ) warehouse_qty ON p.id = warehouse_qty.product_id
          LEFT JOIN (
            SELECT 
              product_id,
              CAST(SUM(quantity) AS DECIMAL) as reserved
            FROM reserves
            WHERE warehouse_id = $1
            GROUP BY product_id
          ) warehouse_reserved ON p.id = warehouse_reserved.product_id
          -- Показываем ВСЕ товары для склада (даже с нулевыми остатками)
          ORDER BY p.name
        `;
        result = await pool.query(queryText, [warehouseId]);
      } else {
        const queryText = `
          SELECT 
            p.id,
            p.name,
            COALESCE(CAST(SUM(CASE WHEN d.status = 'posted' THEN i.quantity ELSE 0 END) AS DECIMAL), 0) as quantity,
            COALESCE(CAST(SUM(r.quantity) AS DECIMAL), 0) as reserved,
            COALESCE(CAST(SUM(CASE WHEN d.status = 'posted' THEN i.quantity ELSE 0 END) AS DECIMAL), 0) - COALESCE(CAST(SUM(r.quantity) AS DECIMAL), 0) as available
          FROM products p
          LEFT JOIN inventory i ON p.id = i.product_id
          LEFT JOIN documents d ON i.document_id = d.id
          LEFT JOIN reserves r ON p.id = r.product_id
          WHERE (d.status = 'posted' OR d.status IS NULL OR i.id IS NULL)
          GROUP BY p.id, p.name
          ORDER BY p.name
        `;
        result = await pool.query(queryText);
      }

      const duration = Date.now() - startTime;
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
      logger.debug("Inventory availability completed", {
        duration: `${duration}ms`,
        rowCount: result.rows.length,
        service: "inventory"
      });

      // ✅ ИСПРАВЛЕНО: Типизация вместо any для SQL результатов
      return result.rows.map((row: Record<string, unknown>) => ({
        id: row.id as number,
        name: row.name as string,
        quantity: parseFloat(row.quantity as string) || 0,
        reserved: parseFloat(row.reserved as string) || 0,
        available: parseFloat(row.available as string) || 0,
      }));
    } catch (error) {
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.error
      logger.error("Error in getInventoryAvailability", {
        error: (error as Error).message,
        service: "inventory"
      });
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
      views_status: viewsStatus,
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
