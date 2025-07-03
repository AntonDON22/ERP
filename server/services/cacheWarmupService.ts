/**
 * Сервис разогрева кеша при запуске сервера
 * Предзагружает часто используемые данные для повышения Cache Hit Rate
 */

import { logger } from "../../shared/logger";
import { cacheService } from "./cacheService";
import { storage } from "../storage";

// ✅ ИСПРАВЛЕНО: Типизация вместо any
interface WarmupConfig {
  key: string;
  ttl: number; // в секундах
  loader: () => Promise<unknown>;
  description: string;
}

export class CacheWarmupService {
  private readonly warmupConfigs: WarmupConfig[] = [
    {
      key: "http:/api/products:{}",
      ttl: 600, // 10 минут для товаров
      loader: () => storage.getProducts(),
      description: "Список всех товаров",
    },
    {
      key: "http:/api/warehouses:{}",
      ttl: 900, // 15 минут для складов
      loader: () => storage.getWarehouses(),
      description: "Список складов",
    },
    {
      key: "http:/api/contractors:{}",
      ttl: 900, // 15 минут для контрагентов
      loader: () => storage.getContractors(),
      description: "Список контрагентов",
    },
    {
      key: "http:/api/suppliers:{}",
      ttl: 900, // 15 минут для поставщиков
      loader: () => storage.getSuppliers(),
      description: "Список поставщиков",
    },
    {
      key: "inventory:/inventory:all",
      ttl: 60, // 1 минута для остатков (часто изменяются)
      loader: () => storage.getInventory(),
      description: "Остатки товаров",
    },
    {
      key: "inventory:/inventory/availability:all",
      ttl: 60, // 1 минута для доступности
      loader: async () => {
        // Используем специальный метод для получения доступности
        try {
          // Эмулируем вызов метода availability через материализованное представление
          const availability = await storage.getInventory();
          return availability.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity || 0,
          }));
        } catch (error) {
          logger.warn("Fallback к обычному getInventory для доступности", {
            error: error instanceof Error ? error.message : String(error),
          });
          return storage.getInventory();
        }
      },
      description: "Доступность товаров",
    },
  ];

  /**
   * Запускает разогрев кеша для всех конфигураций
   */
  async warmupCache(forceWarmup: boolean = false): Promise<void> {
    const startTime = Date.now();
    logger.info("Запуск разогрева кеша при старте сервера", {
      configs: this.warmupConfigs.length,
      forced: forceWarmup,
    });

    const results = await Promise.allSettled(
      this.warmupConfigs.map((config) => this.warmupSingleCache(config, forceWarmup))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const duration = Date.now() - startTime;

    logger.info("Разогрев кеша завершен", {
      successful,
      failed,
      total: this.warmupConfigs.length,
      duration: `${duration}ms`,
      forced: forceWarmup,
    });

    // Логируем ошибки
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const config = this.warmupConfigs[index];
        logger.error("Ошибка разогрева кеша", {
          key: config.key,
          description: config.description,
          error: result.reason?.message || result.reason,
        });
      }
    });
  }

  /**
   * Принудительно обновляет весь кеш (для холодного старта)
   */
  async forceWarmupAll(): Promise<void> {
    logger.info("Принудительный разогрев всего кеша");
    await this.warmupCache(true);
  }

  /**
   * Разогревает один кеш
   */
  private async warmupSingleCache(
    config: WarmupConfig,
    forceWarmup: boolean = false
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Проверяем, нет ли уже данных в кеше (только если не принудительный разогрев)
      if (!forceWarmup) {
        const existingData = await cacheService.get(config.key);
        if (existingData) {
          logger.debug("Кеш уже содержит данные, пропускаем разогрев", {
            key: config.key,
            description: config.description,
          });
          return;
        }
      }

      // Загружаем данные
      const data = await config.loader();

      // Сохраняем в кеш
      await cacheService.set(config.key, data, config.ttl);

      const duration = Date.now() - startTime;
      logger.info("Кеш разогрет успешно", {
        key: config.key,
        description: config.description,
        ttl: `${config.ttl}s`,
        dataSize: JSON.stringify(data).length,
        duration: `${duration}ms`,
        forced: forceWarmup,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Ошибка разогрева кеша", {
        key: config.key,
        description: config.description,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Разогревает кеш для конкретного ключа
   */
  async warmupSpecificCache(key: string): Promise<boolean> {
    const config = this.warmupConfigs.find((c) => c.key === key);
    if (!config) {
      logger.warn("Конфигурация для разогрева кеша не найдена", { key });
      return false;
    }

    try {
      await this.warmupSingleCache(config);
      return true;
    } catch (error) {
      logger.error("Ошибка разогрева конкретного кеша", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Возвращает список всех конфигураций разогрева
   */
  getWarmupConfigs(): Array<{ key: string; ttl: number; description: string }> {
    return this.warmupConfigs.map(({ key, ttl, description }) => ({
      key,
      ttl,
      description,
    }));
  }

  /**
   * Проверяет статус разогрева кеша
   */
  async getWarmupStatus(): Promise<
    Array<{
      key: string;
      description: string;
      isCached: boolean;
      ttl?: number;
    }>
  > {
    const statuses = await Promise.allSettled(
      this.warmupConfigs.map(async (config) => {
        // ✅ ИСПРАВЛЕНО: Используем get() для проверки существования
        const cachedValue = await cacheService.get(config.key);
        const isCached = cachedValue !== null;
        return {
          key: config.key,
          description: config.description,
          isCached,
          ttl: config.ttl,
        };
      })
    );

    return statuses.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        const config = this.warmupConfigs[index];
        return {
          key: config.key,
          description: config.description,
          isCached: false,
          ttl: config.ttl,
        };
      }
    });
  }
}

export const cacheWarmupService = new CacheWarmupService();
