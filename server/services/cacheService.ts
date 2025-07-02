import { createClient, RedisClientType } from 'redis';
import { logger } from '@shared/logger';

// Простой in-memory кеш для fallback
interface CacheEntry {
  value: any;
  expiry: number;
}

class CacheService {
  private client: RedisClientType;
  private isConnected = false;
  private memoryCache = new Map<string, CacheEntry>();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Настройки для Upstash и облачного Redis с TLS
    const redisConfig: any = {
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
        // Для rediss:// (TLS) добавляем настройки SSL
        ...(redisUrl.startsWith('rediss://') && {
          tls: true,
          rejectUnauthorized: false  // Для работы с Upstash
        })
      }
    };

    this.client = createClient(redisConfig);

    this.client.on('error', (err) => {
      logger.warn('Redis connection failed, using memory cache', { error: err.message });
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis disconnected, falling back to memory');
      this.isConnected = false;
    });

    // Автоматически пытаемся подключиться при старте
    this.tryConnect();
  }

  private async tryConnect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.info('Using memory cache (Redis unavailable)', { error: error instanceof Error ? error.message : String(error) });
      this.isConnected = false;
    }
  }

  async connect(): Promise<void> {
    await this.tryConnect();
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Сначала пытаемся Redis
    if (this.isConnected) {
      try {
        const value = await this.client.get(key);
        if (value) {
          return JSON.parse(value);
        }
      } catch (error) {
        logger.warn('Redis get failed, trying memory cache', { key, error });
      }
    }

    // Fallback на memory cache
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiry) {
        return entry.value;
      } else {
        // Удаляем истёкшую запись
        this.memoryCache.delete(key);
      }
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    // Пытаемся Redis
    if (this.isConnected) {
      try {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      } catch (error) {
        logger.warn('Redis set failed, using memory cache', { key, error });
        this.isConnected = false;
      }
    }

    // Всегда сохраняем в memory cache как fallback
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.memoryCache.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    // Удаляем из Redis если возможно
    if (this.isConnected) {
      try {
        await this.client.del(key);
      } catch (error) {
        logger.warn('Redis delete failed', { key, error });
      }
    }

    // Всегда удаляем из memory cache
    this.memoryCache.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    let redisKeysCount = 0;
    
    // Удаляем из Redis если возможно
    if (this.isConnected) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          redisKeysCount = keys.length;
        }
      } catch (error) {
        logger.warn('Redis pattern invalidation failed', { pattern, error });
      }
    }

    // Удаляем подходящие ключи из memory cache
    const memoryKeysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (this.matchesPattern(key, pattern)) {
        memoryKeysToDelete.push(key);
      }
    });
    
    for (const key of memoryKeysToDelete) {
      this.memoryCache.delete(key);
    }

    if (redisKeysCount > 0 || memoryKeysToDelete.length > 0) {
      logger.info('Cache pattern invalidated', { 
        pattern, 
        redisKeys: redisKeysCount, 
        memoryKeys: memoryKeysToDelete.length 
      });
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Простое сопоставление паттернов Redis (только * в конце)
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return key.startsWith(prefix);
    }
    return key === pattern;
  }

  // Утилитарные методы для генерации ключей кеша
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // Кеширование с автоматическим обновлением
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlSeconds = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}

export const cacheService = new CacheService();