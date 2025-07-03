import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Мокаем logger
vi.mock('../../shared/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { cacheService } from '../../server/services/cacheService';

describe('CacheService', () => {
  beforeEach(async () => {
    // Очищаем кеш перед каждым тестом
    await cacheService.del('test-key');
    await cacheService.del('test-key-2');
    await cacheService.invalidatePattern('test:*');
  });

  afterEach(async () => {
    // Очищаем кеш после каждого теста
    await cacheService.del('test-key');
    await cacheService.del('test-key-2');
    await cacheService.invalidatePattern('test:*');
  });

  describe('Memory Cache Fallback', () => {
    it('должен сохранять и получать данные из memory cache', async () => {
      const testData = { message: 'test data', timestamp: Date.now() };
      
      // Сохраняем данные
      await cacheService.set('test-key', testData, 60);
      
      // Получаем данные
      const retrieved = await cacheService.get('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('должен возвращать null для несуществующего ключа', async () => {
      const result = await cacheService.get('nonexistent-key');
      expect(result).toBeNull();
    });

    it('должен удалять данные из кеша', async () => {
      const testData = { value: 'test' };
      
      // Сохраняем данные
      await cacheService.set('test-key', testData);
      
      // Проверяем что данные есть
      let retrieved = await cacheService.get('test-key');
      expect(retrieved).toEqual(testData);
      
      // Удаляем данные
      await cacheService.del('test-key');
      
      // Проверяем что данных нет
      retrieved = await cacheService.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('должен удалять истёкшие данные', async () => {
      const testData = { value: 'test' };
      
      // Сохраняем данные с TTL 1 секунда
      await cacheService.set('test-key', testData, 1);
      
      // Проверяем что данные есть
      let retrieved = await cacheService.get('test-key');
      expect(retrieved).toEqual(testData);
      
      // Ждем истечения TTL
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Проверяем что данных нет
      retrieved = await cacheService.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('должен работать с разными типами данных', async () => {
      const testCases = [
        { key: 'string', value: 'test string' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'object', value: { nested: { data: 'value' } } },
        { key: 'array', value: [1, 2, 3, 'test'] },
        { key: 'null', value: null }
      ];

      // Сохраняем все типы данных
      for (const testCase of testCases) {
        await cacheService.set(testCase.key, testCase.value);
      }

      // Проверяем все типы данных
      for (const testCase of testCases) {
        const retrieved = await cacheService.get(testCase.key);
        expect(retrieved).toEqual(testCase.value);
      }
    });
  });

  describe('Pattern Invalidation', () => {
    it('должен удалять ключи по паттерну', async () => {
      // Сохраняем тестовые данные
      await cacheService.set('test:item1', { id: 1 });
      await cacheService.set('test:item2', { id: 2 });
      await cacheService.set('other:item', { id: 3 });
      
      // Проверяем что данные сохранены
      expect(await cacheService.get('test:item1')).toEqual({ id: 1 });
      expect(await cacheService.get('test:item2')).toEqual({ id: 2 });
      expect(await cacheService.get('other:item')).toEqual({ id: 3 });
      
      // Удаляем по паттерну test:*
      await cacheService.invalidatePattern('test:*');
      
      // Проверяем результат
      expect(await cacheService.get('test:item1')).toBeNull();
      expect(await cacheService.get('test:item2')).toBeNull();
      expect(await cacheService.get('other:item')).toEqual({ id: 3 }); // Не должен быть удален
    });

    it('должен удалять точное совпадение ключа', async () => {
      await cacheService.set('exact-key', { value: 'test' });
      await cacheService.set('exact-key-similar', { value: 'test2' });
      
      // Удаляем точное совпадение
      await cacheService.invalidatePattern('exact-key');
      
      expect(await cacheService.get('exact-key')).toBeNull();
      expect(await cacheService.get('exact-key-similar')).toEqual({ value: 'test2' });
    });
  });

  describe('GetOrSet Method', () => {
    it('должен вызвать fetchFn если данных нет в кеше', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ fetched: true });
      
      const result = await cacheService.getOrSet('new-key', fetchFn, 60);
      
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(result).toEqual({ fetched: true });
      
      // Проверяем что данные сохранились в кеше
      const cached = await cacheService.get('new-key');
      expect(cached).toEqual({ fetched: true });
    });

    it('должен возвращать данные из кеша без вызова fetchFn', async () => {
      const cachedData = { cached: true };
      await cacheService.set('existing-key', cachedData);
      
      const fetchFn = vi.fn().mockResolvedValue({ fetched: true });
      
      const result = await cacheService.getOrSet('existing-key', fetchFn, 60);
      
      expect(fetchFn).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });
  });

  describe('Performance', () => {
    it('должен работать быстро с memory cache', async () => {
      const testData = { large: 'data'.repeat(1000) };
      
      const startSet = Date.now();
      await cacheService.set('perf-test', testData);
      const setTime = Date.now() - startSet;
      
      const startGet = Date.now();
      const retrieved = await cacheService.get('perf-test');
      const getTime = Date.now() - startGet;
      
      expect(retrieved).toEqual(testData);
      expect(setTime).toBeLessThan(100); // Должно быть быстрее 100ms
      expect(getTime).toBeLessThan(50);  // Должно быть быстрее 50ms
    });
  });
});