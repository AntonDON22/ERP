import { Request, Response, NextFunction } from "express";
import { cacheService } from "../services/cacheService";
import { PerformanceMetricsService } from "../services/performanceMetricsService";
import { logger } from "@shared/logger";

interface CacheOptions {
  ttl?: number;
  skipCache?: boolean;
  keyGenerator?: (req: Request) => string;
}

export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = 300, skipCache = false, keyGenerator } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    let cacheHit = false;

    // Кешируем только GET запросы
    if (req.method !== "GET" || skipCache) {
      return next();
    }

    // Генерируем ключ кеша
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `http:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      // Пытаемся получить из кеша
      logger.debug("Cache lookup attempt", {
        key: cacheKey,
        method: req.method,
        url: req.originalUrl,
      });
      const cachedResponse = await cacheService.get(cacheKey);

      if (cachedResponse) {
        cacheHit = true;
        const responseTime = Date.now() - startTime;
        PerformanceMetricsService.recordRequest(req.originalUrl, responseTime, true, 0);
        logger.debug("Cache hit", {
          key: cacheKey,
          dataSize: JSON.stringify(cachedResponse).length,
        });
        return res.json(cachedResponse);
      } else {
        logger.debug("Cache miss", { key: cacheKey });
      }

      // Если в кеше нет, перехватываем оригинальный response
      const originalJson = res.json;
      let responseData: any;

      res.json = function (data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Обработчик завершения response
      res.on("finish", async () => {
        const responseTime = Date.now() - startTime;
        PerformanceMetricsService.recordRequest(req.originalUrl, responseTime, cacheHit, 1);

        if (res.statusCode === 200 && responseData) {
          try {
            await cacheService.set(cacheKey, responseData, ttl);
            logger.debug("Response cached", {
              key: cacheKey,
              size: JSON.stringify(responseData).length,
            });
          } catch (error) {
            logger.warn("Failed to cache response", { key: cacheKey, error });
          }
        }
      });

      next();
    } catch (error) {
      logger.warn("Cache middleware error", { error });
      next();
    }
  };
}

// Предустановленные конфигурации кеширования
export const shortCache = cacheMiddleware({ ttl: 60 }); // 1 минута
export const mediumCache = cacheMiddleware({ ttl: 300 }); // 5 минут
export const longCache = cacheMiddleware({ ttl: 900 }); // 15 минут

// Специализированные кеши
export const inventoryCache = cacheMiddleware({
  ttl: 180, // 3 минуты для инвентаря
  keyGenerator: (req) => `inventory:${req.path}:${req.query.warehouseId || "all"}`,
});

export const productsCache = cacheMiddleware({
  ttl: 600, // 10 минут для продуктов
  keyGenerator: (req) => `products:${req.path}:${req.query.search || "all"}`,
});
