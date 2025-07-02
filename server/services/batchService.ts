import { db } from "../db";
import { products, suppliers, contractors, warehouses, documents } from "@shared/schema";
import { inArray } from "drizzle-orm";
import { dbLogger, getErrorMessage } from "@shared/logger";
import { BATCH_SIZES } from "@shared/constants";

/**
 * 🚀 Сервис для оптимизированных batch операций
 * Заменяет N+1 запросы на эффективные массовые операции
 */
export class BatchService {
  
  /**
   * 📦 Массовое удаление товаров
   */
  async deleteProducts(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    
    const endOperation = dbLogger.startOperation('batchDeleteProducts');
    try {
      // Разделяем на batch'и для предотвращения timeout'ов
      await this.processBatches(ids, async (batch) => {
        await db.delete(products).where(inArray(products.id, batch));
      });
      
      endOperation();
      return true;
    } catch (error) {
      dbLogger.error('Error in batch delete products', { 
        error: getErrorMessage(error),
        idsCount: ids.length 
      });
      endOperation();
      return false;
    }
  }

  /**
   * 👥 Массовое удаление поставщиков
   */
  async deleteSuppliers(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    
    const endOperation = dbLogger.startOperation('batchDeleteSuppliers');
    try {
      await this.processBatches(ids, async (batch) => {
        await db.delete(suppliers).where(inArray(suppliers.id, batch));
      });
      
      endOperation();
      return true;
    } catch (error) {
      dbLogger.error('Error in batch delete suppliers', { 
        error: getErrorMessage(error),
        idsCount: ids.length 
      });
      endOperation();
      return false;
    }
  }

  /**
   * 🤝 Массовое удаление контрагентов
   */
  async deleteContractors(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    
    const endOperation = dbLogger.startOperation('batchDeleteContractors');
    try {
      await this.processBatches(ids, async (batch) => {
        await db.delete(contractors).where(inArray(contractors.id, batch));
      });
      
      endOperation();
      return true;
    } catch (error) {
      dbLogger.error('Error in batch delete contractors', { 
        error: getErrorMessage(error),
        idsCount: ids.length 
      });
      endOperation();
      return false;
    }
  }

  /**
   * 🏭 Массовое удаление складов
   */
  async deleteWarehouses(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    
    const endOperation = dbLogger.startOperation('batchDeleteWarehouses');
    try {
      await this.processBatches(ids, async (batch) => {
        await db.delete(warehouses).where(inArray(warehouses.id, batch));
      });
      
      endOperation();
      return true;
    } catch (error) {
      dbLogger.error('Error in batch delete warehouses', { 
        error: getErrorMessage(error),
        idsCount: ids.length 
      });
      endOperation();
      return false;
    }
  }

  /**
   * 📄 Массовое удаление документов
   */
  async deleteDocuments(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    
    const endOperation = dbLogger.startOperation('batchDeleteDocuments');
    try {
      await this.processBatches(ids, async (batch) => {
        await db.delete(documents).where(inArray(documents.id, batch));
      });
      
      endOperation();
      return true;
    } catch (error) {
      dbLogger.error('Error in batch delete documents', { 
        error: getErrorMessage(error),
        idsCount: ids.length 
      });
      endOperation();
      return false;
    }
  }

  /**
   * 🔧 Универсальная функция для обработки в batch'ах
   */
  private async processBatches<T>(
    items: T[],
    operation: (batch: T[]) => Promise<void>,
    batchSize: number = BATCH_SIZES.MEDIUM
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await operation(batch);
    }
  }

  /**
   * 📊 Статистика batch операций
   */
  async getBatchOperationStats(ids: number[]): Promise<{
    totalItems: number;
    batchCount: number;
    estimatedTime: number; // в миллисекундах
  }> {
    const batchSize = BATCH_SIZES.MEDIUM;
    const totalItems = ids.length;
    const batchCount = Math.ceil(totalItems / batchSize);
    const estimatedTime = batchCount * 50; // примерно 50ms на batch

    return {
      totalItems,
      batchCount,
      estimatedTime
    };
  }

  /**
   * 🎯 Оптимизированная batch операция с прогрессом
   */
  async processBatchWithProgress<T>(
    items: T[],
    operation: (batch: T[]) => Promise<void>,
    onProgress?: (completed: number, total: number) => void,
    batchSize: number = BATCH_SIZES.MEDIUM
  ): Promise<void> {
    const totalBatches = Math.ceil(items.length / batchSize);
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await operation(batch);
      
      const currentBatch = Math.floor(i / batchSize) + 1;
      if (onProgress) {
        onProgress(currentBatch, totalBatches);
      }
    }
  }
}

export const batchService = new BatchService();