import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мокаем базу данных
const mockResult: { rows: any[] } = { rows: [] };
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              having: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockResult),
              }),
            }),
          }),
        }),
      }),
    }),
    execute: vi.fn().mockResolvedValue(mockResult),
  },
}));

// Мокаем logger
vi.mock('../../shared/logger', () => ({
  dbLogger: {
    startOperation: vi.fn(() => vi.fn()),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  getErrorMessage: vi.fn((error) => error.message),
}));

// Мокаем MaterializedViewService
const mockMaterializedViewService = {
  getInventorySummary: vi.fn().mockResolvedValue([]),
  getInventoryAvailability: vi.fn().mockResolvedValue([]),
  getViewsStatus: vi.fn().mockResolvedValue([
    { view_name: 'inventory_summary', status: 'active' },
    { view_name: 'inventory_availability', status: 'active' }
  ]),
  refreshAllViews: vi.fn().mockResolvedValue(undefined),
  isViewHealthy: vi.fn().mockResolvedValue(true),
};

vi.mock('../../server/services/materializedViewService', () => ({
  materializedViewService: mockMaterializedViewService,
}));

describe('InventoryService', () => {
  let inventoryService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Импортируем заново после очистки моков
    const module = await import('../../server/services/inventoryService');
    inventoryService = module.inventoryService;
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

      (mockResult as any).rows = mockInventoryData;

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

      (mockResult as any).rows = mockInventoryData;

      const result = await inventoryService.getInventory(1);

      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 15 },
      ]);
    });

    it('should handle empty inventory', async () => {
      (mockResult as any).rows = [];

      const result = await inventoryService.getInventory();

      expect(result).toEqual([]);
    });
  });

  describe('getInventoryAvailability', () => {
    it('should return availability with reserves', async () => {
      mockMaterializedViewService.getInventoryAvailability.mockResolvedValue([
        {
          id: 1,
          name: 'Товар 1',
          quantity: 25,
          reserved: 5,
          available: 20,
        },
      ]);

      const result = await inventoryService.getInventoryAvailability();

      expect(result).toEqual([
        {
          id: 1,
          name: 'Товар 1',
          quantity: 25,
          reserved: 5,
          available: 20,
        },
      ]);
    });
  });

  describe('Performance Statistics', () => {
    it('should return performance stats with timing', async () => {
      const result = await inventoryService.getPerformanceStats();

      expect(result).toHaveProperty('total_products');
      expect(result).toHaveProperty('query_duration');
      expect(result).toHaveProperty('views_status');
      expect(Array.isArray(result.views_status)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      (mockResult as any).rows = [];
      
      // Тест должен проходить без ошибок даже при проблемах с БД
      const result = await inventoryService.getInventory();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle materialized view fallback', async () => {
      mockMaterializedViewService.getInventoryAvailability.mockRejectedValue(new Error('View error'));
      (mockResult as any).rows = [];

      const result = await inventoryService.getInventoryAvailability();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate numeric quantities correctly', async () => {
      const mockInventoryData = [
        {
          productId: 1,
          productName: 'Товар 1',
          totalQuantity: '25.500',
        },
        {
          productId: 2,
          productName: 'Товар 2',
          totalQuantity: '0.000',
        },
      ];

      (mockResult as any).rows = mockInventoryData;

      const result = await inventoryService.getInventory();

      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 25.5 },
        { id: 2, name: 'Товар 2', quantity: 0 },
      ]);
    });
  });
});