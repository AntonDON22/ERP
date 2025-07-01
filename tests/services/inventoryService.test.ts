import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inventoryService } from '../../server/services/inventoryService';
import { db } from '../../server/db';

// Мокаем базу данных
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  }
}));

// Мокаем logger
vi.mock('@shared/logger', () => ({
  dbLogger: {
    startOperation: vi.fn(() => vi.fn()),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  getErrorMessage: vi.fn((error) => error.message),
}));

// Мокаем MaterializedViewService
vi.mock('@server/services/materializedViewService', () => ({
  materializedViewService: {
    isInitialized: vi.fn(() => true),
    refreshViews: vi.fn(),
  }
}));

describe('InventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInventory', () => {
    it('should return inventory with correct totals', async () => {
      const mockInventoryData = [
        {
          productId: 1,
          productName: 'Товар 1',
          totalQuantity: '25.500',
        },
        {
          productId: 2,
          productName: 'Товар 2',
          totalQuantity: '10.000',
        },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                having: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockInventoryData),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await inventoryService.getInventory();

      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 25.5 },
        { id: 2, name: 'Товар 2', quantity: 10 },
      ]);
    });

    it('should filter by warehouse when warehouseId provided', async () => {
      const mockInventoryData = [
        {
          productId: 1,
          productName: 'Товар 1',
          totalQuantity: '15.000',
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                having: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockInventoryData),
                }),
              }),
            }),
          }),
        }),
      };

      (db.select as any).mockReturnValue(mockSelect);

      const result = await inventoryService.getInventory(2);

      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 15 },
      ]);
      expect(mockSelect.from).toHaveBeenCalled();
    });

    it('should handle empty inventory', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                having: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await inventoryService.getInventory();
      expect(result).toEqual([]);
    });
  });

  describe('getInventoryAvailability', () => {
    it('should return availability with reserves calculation', async () => {
      const mockAvailabilityData = [
        {
          productId: 1,
          productName: 'Товар 1',
          totalStock: '100.000',
          totalReserved: '20.000',
        },
        {
          productId: 2,
          productName: 'Товар 2',
          totalStock: '50.000',
          totalReserved: '0.000',
        },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  having: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue(mockAvailabilityData),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await inventoryService.getInventoryAvailability();

      expect(result).toEqual([
        {
          id: 1,
          name: 'Товар 1',
          stock: 100,
          reserved: 20,
          available: 80,
        },
        {
          id: 2,
          name: 'Товар 2',
          stock: 50,
          reserved: 0,
          available: 50,
        },
      ]);
    });

    it('should handle negative availability correctly', async () => {
      const mockAvailabilityData = [
        {
          productId: 1,
          productName: 'Товар 1',
          totalStock: '10.000',
          totalReserved: '25.000',
        },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  having: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue(mockAvailabilityData),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await inventoryService.getInventoryAvailability();

      expect(result).toEqual([
        {
          id: 1,
          name: 'Товар 1',
          stock: 10,
          reserved: 25,
          available: -15, // Отрицательное значение показывает превышение резерва
        },
      ]);
    });
  });

  describe('Performance Statistics', () => {
    it('should return performance stats with timing', async () => {
      // Мокаем возвращаемые данные для статистики
      (db.execute as any).mockResolvedValue({
        rows: [
          { view_name: 'inventory_summary', exists: true, last_refresh: '2025-07-01 12:00:00' },
          { view_name: 'inventory_availability', exists: true, last_refresh: '2025-07-01 12:00:00' },
        ]
      });

      const result = await inventoryService.getPerformanceStats();

      expect(result).toHaveProperty('materializedViews');
      expect(result).toHaveProperty('queryPerformance');
      expect(result.materializedViews).toHaveProperty('inventory_summary');
      expect(result.materializedViews).toHaveProperty('inventory_availability');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (db.select as any).mockImplementation(() => {
        throw dbError;
      });

      await expect(inventoryService.getInventory()).rejects.toThrow('Database connection failed');
    });

    it('should handle materialized view fallback', async () => {
      // Первый вызов с материализованными представлениями падает
      let callCount = 0;
      (db.select as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Materialized view error');
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  having: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await inventoryService.getInventory();
      
      // Проверяем что система переключилась на fallback
      expect(result).toEqual([]);
      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('Data Validation', () => {
    it('should validate numeric quantities correctly', async () => {
      const mockInventoryData = [
        {
          productId: 1,
          productName: 'Товар 1',
          totalQuantity: 'invalid_number',
        },
        {
          productId: 2,
          productName: 'Товар 2',
          totalQuantity: '25.500',
        },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                having: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockInventoryData),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await inventoryService.getInventory();

      // Система должна обработать невалидные данные
      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 0 }, // Невалидное значение заменено на 0
        { id: 2, name: 'Товар 2', quantity: 25.5 },
      ]);
    });
  });
});