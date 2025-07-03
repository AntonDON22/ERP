import { db } from "../db";
import { sql } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { normalizeInventoryArray, type NormalizedInventoryItem } from "@shared/apiNormalizer";
import { logger } from "../../shared/logger";

export class MaterializedViewService {
  /**
   * Инициализация материализованных представлений
   */
  async initializeMaterializedViews(): Promise<void> {
    // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
    logger.info("🔄 Инициализация материализованных представлений...");

    try {
      const sqlPath = path.join(__dirname, "../db/materialized-views.sql");
      const sqlScript = await fs.readFile(sqlPath, "utf-8");

      // Выполняем SQL скрипт по частям
      const statements = sqlScript
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement.trim()) {
          await db.execute(sql.raw(statement + ";"));
        }
      }

      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
      logger.info("✅ Материализованные представления созданы успешно");
    } catch (error) {
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.error
      logger.error("❌ Ошибка при создании материализованных представлений:", { error });
      throw error;
    }
  }

  /**
   * Обновление всех материализованных представлений
   */
  async refreshAllViews(): Promise<void> {
    // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
    logger.info("🔄 Обновление всех материализованных представлений...");

    try {
      await db.execute(sql`SELECT refresh_materialized_views()`);
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
      logger.info("✅ Все материализованные представления обновлены");
    } catch (error) {
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.error
      logger.error("❌ Ошибка при обновлении представлений:", { error });
      throw error;
    }
  }

  /**
   * Получение остатков из материализованного представления
   * Возвращает нормализованные данные в унифицированном API формате
   */
  async getInventorySummary(): Promise<NormalizedInventoryItem[]> {
    // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
    logger.debug("Starting getInventorySummary query", { service: "materialized" });
    const startTime = Date.now();

    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          quantity::text as total_quantity
        FROM inventory_summary
        ORDER BY name
      `);

      const duration = Date.now() - startTime;
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.log
      logger.debug("getInventorySummary completed", {
        duration: `${duration}ms`,
        rowCount: result.rows.length,
        service: "materialized"
      });

      // ✅ ИСПРАВЛЕНО: Типизация вместо any для SQL результатов
      const rawData = result.rows.map((row: Record<string, unknown>) => ({
        id: row.id as number,
        name: row.name as string,
        total_quantity: row.total_quantity as string,
      }));

      return normalizeInventoryArray(rawData);
    } catch (error) {
      // ✅ ИСПРАВЛЕНО: Структурированное логирование вместо console.error
      logger.error("Error in getInventorySummary", {
        error: (error as Error).message,
        service: "materialized"
      });
      throw error;
    }
  }

  /**
   * Получение остатков по складам из материализованного представления
   */
  async getInventoryByWarehouse(warehouseId?: number): Promise<
    Array<{
      product_id: number;
      product_name: string;
      warehouse_id: number;
      warehouse_name: string;
      quantity: string;
      movement_count: number;
      last_movement_date: Date | null;
    }>
  > {
    console.log("[MATERIALIZED] Starting getInventoryByWarehouse query...");
    const startTime = Date.now();

    try {
      const whereClause = warehouseId ? sql`WHERE warehouse_id = ${warehouseId}` : sql``;

      const result = await db.execute(sql`
        SELECT 
          product_id,
          product_name,
          warehouse_id,
          warehouse_name,
          quantity::text,
          movement_count,
          last_movement_date
        FROM inventory_by_warehouse
        ${whereClause}
        ORDER BY product_name, warehouse_name
      `);

      const duration = Date.now() - startTime;
      console.log(
        `[MATERIALIZED] getInventoryByWarehouse completed in ${duration}ms, returned ${result.rows.length} items`
      );

      return result.rows as any;
    } catch (error) {
      console.error("[MATERIALIZED] Error in getInventoryByWarehouse:", error);
      throw error;
    }
  }

  /**
   * Получение доступных остатков из материализованного представления
   * Возвращает нормализованные данные в унифицированном API формате
   */
  async getInventoryAvailability(): Promise<NormalizedInventoryItem[]> {
    console.log("[MATERIALIZED] Starting getInventoryAvailability query...");
    const startTime = Date.now();

    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          quantity::text as total_quantity,
          reserved::text as reserved_quantity,
          available::text as available_quantity
        FROM inventory_availability
        ORDER BY name
      `);

      const duration = Date.now() - startTime;
      console.log(
        `[MATERIALIZED] getInventoryAvailability completed in ${duration}ms, returned ${result.rows.length} items`
      );

      // Применяем централизованную нормализацию данных
      const rawData = result.rows.map((row: any) => ({
        id: row.id as number,
        name: row.name as string,
        total_quantity: row.total_quantity as string,
        reserved_quantity: row.reserved_quantity as string,
        available_quantity: row.available_quantity as string,
      }));

      return normalizeInventoryArray(rawData);
    } catch (error) {
      console.error("[MATERIALIZED] Error in getInventoryAvailability:", error);
      throw error;
    }
  }

  /**
   * Проверка статуса материализованных представлений
   */
  async getViewsStatus(): Promise<
    Array<{
      view_name: string;
      size_bytes: number;
      last_refresh: Date | null;
      is_populated: boolean;
    }>
  > {
    try {
      const result = await db.execute(sql`
        SELECT 
          schemaname||'.'||matviewname as view_name,
          pg_total_relation_size(schemaname||'.'||matviewname) as size_bytes,
          ispopulated as is_populated
        FROM pg_matviews 
        WHERE matviewname IN ('inventory_summary', 'inventory_by_warehouse', 'inventory_availability')
      `);

      return result as any;
    } catch (error) {
      console.error("Error getting views status:", error);
      throw error;
    }
  }

  /**
   * Принудительное обновление конкретного представления
   */
  async refreshSpecificView(viewName: string): Promise<void> {
    console.log(`🔄 Обновление представления ${viewName}...`);

    try {
      await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`));
      console.log(`✅ Представление ${viewName} обновлено`);
    } catch (error) {
      console.error(`❌ Ошибка при обновлении представления ${viewName}:`, error);
      throw error;
    }
  }
}

export const materializedViewService = new MaterializedViewService();
