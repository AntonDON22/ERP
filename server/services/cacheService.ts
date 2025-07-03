import { createClient, RedisClientType } from "redis";
import { logger } from "@shared/logger";

// ✅ ИСПРАВЛЕНО: Типизированный интерфейс вместо any
interface CacheEntry<T = unknown> {
  value: T;
  expiry: number;
}

// ✅ ИСПРАВЛЕНО: Полностью static класс согласно стандартам
class CacheService {
  private static client: RedisClientType;
  private static isConnected = false;
  private static memoryCache = new Map<string, CacheEntry>();

  // ✅ ИСПРАВЛЕНО: Static инициализация
  static async initialize(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      // ✅ ИСПРАВЛЕНО: Упрощенная конфигурация Redis без socket настроек
      this.client = createClient({
        url: redisUrl,
      });

      this.client.on("error", (err) => {
        logger.warn("Redis connection failed, using memory cache", { error: err.message });
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        logger.info("Redis connected successfully");
        this.isConnected = true;
      });

      this.client.on("disconnect", () => {
        logger.warn("Redis disconnected, falling back to memory");
        this.isConnected = false;
      });

      // Автоматически пытаемся подключиться при старте
      await this.tryConnect();
    } catch (error) {
      logger.error("Failed to initialize CacheService", { error });
      throw error; // ✅ ОБЯЗАТЕЛЬНО: Проброс ошибок
    }
  }

  // ✅ ИСПРАВЛЕНО: Static метод
  private static async tryConnect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.info("Using memory cache (Redis unavailable)", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.isConnected = false;
    }
  }

  // ✅ ИСПРАВЛЕНО: Static метод
  static async connect(): Promise<void> {
    try {
      await this.tryConnect();
    } catch (error) {
      logger.error("Failed to connect to cache", { error });
      throw error; // ✅ ОБЯЗАТЕЛЬНО: Проброс ошибок
    }
  }

  // ✅ ИСПРАВЛЕНО: Static метод
  static async disconnect(): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.disconnect();
      }
    } catch (error) {
      logger.error("Failed to disconnect from cache", { error });
      throw error; // ✅ ОБЯЗАТЕЛЬНО: Проброс ошибок
    }
  }

  // ✅ ИСПРАВЛЕНО: Static метод с типизацией
  static async get<T = unknown>(key: string): Promise<T | null> {
    try {
      // Сначала пытаемся Redis
      if (this.isConnected && this.client) {
        try {
          const value = await this.client.get(key);
          if (value) {
            return JSON.parse(value) as T;
          }
        } catch (error) {
          logger.warn("Redis get failed, trying memory cache", { key, error });
        }
      }

      // Fallback на memory cache
      const entry = this.memoryCache.get(key);
      if (entry) {
        if (Date.now() < entry.expiry) {
          return entry.value as T;
        } else {
          // Удаляем истёкшую запись
          this.memoryCache.delete(key);
        }
      }

      return null;
    } catch (error) {
      logger.error("Failed to get from cache", { key, error });
      throw error; // ✅ ОБЯЗАТЕЛЬНО: Проброс ошибок
    }
  }

  // ✅ ИСПРАВЛЕНО: Static метод с типизацией вместо any
  static async set<T = unknown>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      // Пытаемся Redis
      if (this.isConnected && this.client) {
        try {
          await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
        } catch (error) {
          logger.warn("Redis set failed, using memory cache", { key, error });
          this.isConnected = false;
        }
      }

      // Всегда сохраняем в memory cache как fallback
      this.memoryCache.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000,
      });
    } catch (error) {
      logger.error("Failed to set in cache", { key, error });
      throw error; // ✅ ОБЯЗАТЕЛЬНО: Проброс ошибок
    }
  }

  // ✅ ИСПРАВЛЕНО: Static метод
  static async del(key: string): Promise<void> {
    try {
      // Удаляем из Redis
      if (this.isConnected && this.client) {
        try {
          await this.client.del(key);
        } catch (error) {
          logger.warn("Redis del failed", { key, error });
        }
      }

      // Удаляем из memory cache
      this.memoryCache.delete(key);
    } catch (error) {
      logger.error("Failed to delete from cache", { key, error });
      throw error; // ✅ ОБЯЗАТЕЛЬНО: Проброс ошибок
    }
  }

  // ✅ ИСПРАВЛЕНО: Static метод
  static async delPattern(pattern: string): Promise<void> {
    try {
      // Очищаем Redis по паттерну
      if (this.isConnected && this.client) {
        try {
          const keys = await this.client.keys(pattern);
          if (keys.length > 0) {
            await this.client.del(keys);
          }
        } catch (error) {
          logger.warn("Redis pattern delete failed", { pattern, error });
        }
      }

      // Очищаем memory cache по паттерну
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((_, key) => {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    } catch (error) {
      logger.error("Failed to delete pattern from cache", { pattern, error });
      throw error; // ✅ ОБЯЗАТЕЛЬНО: Проброс ошибок
    }
  }

  // ✅ ИСПРАВЛЕНО: Static метод для очистки устаревших записей  
  static cleanupExpired(): void {
    try {
      const now = Date.now();
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((entry, key) => {
        if (entry.expiry <= now) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    } catch (error) {
      logger.error("Failed to cleanup expired cache entries", { error });
      throw error; // ✅ ОБЯЗАТЕЛЬНО: Проброс ошибок
    }
  }

  // ✅ ДОБАВЛЕНО: Метод invalidatePattern для обратной совместимости
  static async invalidatePattern(pattern: string): Promise<void> {
    await this.delPattern(pattern);
  }

  // ✅ ИСПРАВЛЕНО: Static метод для статистики
  static getStats(): { redisConnected: boolean; memoryCacheSize: number } {
    return {
      redisConnected: this.isConnected,
      memoryCacheSize: this.memoryCache.size,
    };
  }
}

// ✅ ИСПРАВЛЕНО: Экспорт класса и экземпляра для обратной совместимости
export { CacheService };

// Для обратной совместимости с существующим кодом
export const cacheService = CacheService;