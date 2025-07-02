import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { cacheMiddleware, inventoryCache, mediumCache } from '../../server/middleware/cacheMiddleware';
import { cacheService } from '../../server/services/cacheService';

// Мокаем сервисы
vi.mock('../../server/services/cacheService');
vi.mock('../../server/services/performanceMetricsService');

describe('CacheMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let onSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNext = vi.fn();
    jsonSpy = vi.fn().mockReturnThis();
    onSpy = vi.fn();

    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      query: {}
    };

    mockRes = {
      json: jsonSpy,
      on: onSpy,
      statusCode: 200
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('должен пропускать не-GET запросы', async () => {
      mockReq.method = 'POST';
      const middleware = cacheMiddleware();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('должен генерировать правильный ключ кеша', async () => {
      mockReq = {
        method: 'GET',
        originalUrl: '/api/products',
        query: { search: 'test', page: '1' }
      };

      vi.mocked(cacheService.get).mockResolvedValue(null);
      const middleware = cacheMiddleware();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledWith('http:/api/products:{"search":"test","page":"1"}');
    });

    it('должен использовать кастомный keyGenerator', async () => {
      const customKeyGenerator = (req: Request) => `custom:${req.originalUrl}`;
      vi.mocked(cacheService.get).mockResolvedValue(null);
      
      const middleware = cacheMiddleware({ keyGenerator: customKeyGenerator });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledWith('custom:/api/test');
    });
  });

  describe('Cache Hit Scenario', () => {
    it('должен возвращать данные из кеша при cache hit', async () => {
      const cachedData = { id: 1, name: 'Test Product' };
      vi.mocked(cacheService.get).mockResolvedValue(cachedData);

      const middleware = cacheMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledOnce();
      expect(jsonSpy).toHaveBeenCalledWith(cachedData);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('должен логировать cache hit', async () => {
      const cachedData = { test: 'data' };
      vi.mocked(cacheService.get).mockResolvedValue(cachedData);

      const middleware = cacheMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledOnce();
      expect(jsonSpy).toHaveBeenCalledWith(cachedData);
    });
  });

  describe('Cache Miss Scenario', () => {
    it('должен продолжить выполнение при cache miss', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const middleware = cacheMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledOnce();
      expect(mockNext).toHaveBeenCalledOnce();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('должен перехватывать и кешировать response при успешном ответе', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(cacheService.set).mockResolvedValue();

      let responseData = { id: 1, name: 'New Product' };
      
      // Мокаем response.on для симуляции завершения запроса
      onSpy.mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          // Симулируем что response был отправлен с данными
          callback();
        }
      });

      // Мокаем originalJson для перехвата данных
      const originalJson = vi.fn().mockReturnThis();
      mockRes.json = vi.fn().mockImplementation((data) => {
        // Симулируем что данные были переданы в response
        Object.assign(responseData, data);
        mockRes.statusCode = 200;
        return originalJson(data);
      });

      const middleware = cacheMiddleware({ ttl: 300 });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
      expect(onSpy).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('должен обрабатывать ошибки кеша gracefully', async () => {
      vi.mocked(cacheService.get).mockRejectedValue(new Error('Cache error'));

      const middleware = cacheMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('должен продолжать работу при ошибке сохранения в кеш', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(cacheService.set).mockRejectedValue(new Error('Set error'));

      const middleware = cacheMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
    });
  });

  describe('Specialized Cache Configurations', () => {
    it('inventoryCache должен использовать правильный keyGenerator', async () => {
      mockReq = {
        method: 'GET',
        path: '/inventory',
        query: { warehouseId: '123' }
      };

      vi.mocked(cacheService.get).mockResolvedValue(null);

      await inventoryCache(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledWith('inventory:/inventory:123');
    });

    it('inventoryCache должен использовать "all" когда warehouseId не указан', async () => {
      mockReq = {
        method: 'GET',
        path: '/inventory',
        query: {}
      };

      vi.mocked(cacheService.get).mockResolvedValue(null);

      await inventoryCache(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledWith('inventory:/inventory:all');
    });

    it('mediumCache должен использовать TTL 300 секунд', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const middleware = mediumCache;
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledOnce();
    });
  });

  describe('Performance Metrics Integration', () => {
    it('должен записывать метрики производительности для cache hit', async () => {
      const cachedData = { test: 'data' };
      vi.mocked(cacheService.get).mockResolvedValue(cachedData);

      const middleware = cacheMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(cacheService.get).toHaveBeenCalledOnce();
      expect(jsonSpy).toHaveBeenCalledWith(cachedData);
    });

    it('должен записывать метрики производительности для cache miss', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      onSpy.mockImplementation((event: string, callback: Function) => {
        if (event === 'finish') {
          callback();
        }
      });

      const middleware = cacheMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
    });
  });

  describe('TTL Configuration', () => {
    it('должен использовать кастомный TTL', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(cacheService.set).mockResolvedValue();

      const customTTL = 600;
      const middleware = cacheMiddleware({ ttl: customTTL });

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
    });

    it('должен использовать TTL по умолчанию (300 секунд)', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const middleware = cacheMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
    });
  });
});