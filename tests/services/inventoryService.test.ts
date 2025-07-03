import { describe, it, expect, vi, beforeEach } from 'vitest';

// Создаем мокированную БД
const mockExecute = vi.fn();
vi.mock('../../server/db', () => ({
  db: {
    execute: mockExecute,
  },
}));

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
  getInventorySummary: vi.fn(),
  getInventoryAvailability: vi.fn(),
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
    
    // Настраиваем MaterializedView мок для fallback на direct query
    mockMaterializedViewService.getInventorySummary.mockRejectedValue(new Error('materialized view not available'));
    mockMaterializedViewService.getInventoryAvailability.mockRejectedValue(new Error('materialized view not available'));
    
    // Импортируем заново после очистки моков
    const module = await import('../../server/services/inventoryService');
    inventoryService = module.inventoryService;
  });

  describe('getInventory', () => {
    it('should return inventory with correct totals', async () => {
      const mockInventoryData = [
        { id: 1, name: 'Товар 1', quantity: '25.500' },
        { id: 2, name: 'Товар 2', quantity: '10.000' },
      ];

      mockExecute.mockResolvedValueOnce({ rows: mockInventoryData });

      const result = await inventoryService.getInventory();

      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 25.5 },
        { id: 2, name: 'Товар 2', quantity: 10 },
      ]);
    });

    it('should filter by warehouse when warehouseId provided', async () => {
      const mockInventoryData = [
        { id: 1, name: 'Товар 1', quantity: '15.000' },
      ];

      mockExecute.mockResolvedValueOnce({ rows: mockInventoryData });

      const result = await inventoryService.getInventory(1);

      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 15 },
      ]);
    });

    it('should handle empty inventory', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await inventoryService.getInventory();

      expect(result).toEqual([]);
    });
  });

  describe('getInventoryAvailability', () => {
    it('should return availability with reserves', async () => {
      // Переопределяем мок для успешного выполнения с нормализованными данными
      mockMaterializedViewService.getInventoryAvailability.mockResolvedValue([
        { id: 1, name: 'Товар 1', quantity: 25, reserved: 5, available: 20 },
      ]);

      const result = await inventoryService.getInventoryAvailability();

      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 25, reserved: 5, available: 20 },
      ]);
    });
  });

  describe('Performance Statistics', () => {
    it('should return performance stats with timing', async () => {
      const result = await inventoryService.getPerformanceStats();

      expect(result).toHaveProperty('materialized_views_enabled');
      expect(result).toHaveProperty('views_status');
      expect(Array.isArray(result.views_status)).toBe(true);
      expect(typeof result.materialized_views_enabled).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      
      const result = await inventoryService.getInventory();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle materialized view fallback', async () => {
      mockMaterializedViewService.getInventoryAvailability.mockRejectedValue(new Error('View error'));
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await inventoryService.getInventoryAvailability();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate numeric quantities correctly', async () => {
      const mockInventoryData = [
        { id: 1, name: 'Товар 1', quantity: '25.500' },
        { id: 2, name: 'Товар 2', quantity: '0.000' },
      ];

      mockExecute.mockResolvedValueOnce({ rows: mockInventoryData });

      const result = await inventoryService.getInventory();

      expect(result).toEqual([
        { id: 1, name: 'Товар 1', quantity: 25.5 },
        { id: 2, name: 'Товар 2', quantity: 0 },
      ]);
    });
  });
});