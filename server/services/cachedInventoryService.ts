import { cacheService } from './cacheService';
import { storage } from '../storage';
import { logger } from '@shared/logger';

export class CachedInventoryService {
  private static readonly CACHE_TTL = 300; // 5 минут
  private static readonly CACHE_PREFIX = 'inventory';

  // Кешированное получение остатков
  static async getInventory(warehouseId?: number) {
    const cacheKey = `${this.CACHE_PREFIX}:summary:${warehouseId || 'all'}`;

    return cacheService.getOrSet(
      cacheKey,
      () => storage.getInventory(warehouseId),
      this.CACHE_TTL
    );
  }

  // Кешированное получение доступности - используем материализованные представления
  static async getInventoryAvailability(warehouseId?: number) {
    const cacheKey = `${this.CACHE_PREFIX}:availability:${warehouseId || 'all'}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const { InventoryService } = await import('./inventoryService');
        const inventoryService = new InventoryService();
        return inventoryService.getInventoryAvailability(warehouseId);
      },
      this.CACHE_TTL
    );
  }

  // Инвалидация кеша при изменении остатков
  static async invalidateInventoryCache(warehouseId?: number) {
    const patterns = [
      `${this.CACHE_PREFIX}:summary:*`,
      `${this.CACHE_PREFIX}:availability:*`
    ];

    for (const pattern of patterns) {
      await cacheService.invalidatePattern(pattern);
    }

    logger.info('Inventory cache invalidated', { warehouseId });
  }

  // Предварительная загрузка кеша
  static async preloadCache() {
    try {
      // Загружаем общие остатки
      await this.getInventory();
      await this.getInventoryAvailability();

      logger.info('Inventory cache preloaded successfully');
    } catch (error) {
      logger.warn('Failed to preload inventory cache', { error });
    }
  }
}