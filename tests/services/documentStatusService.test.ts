import { describe, it, expect, beforeEach, vi } from 'vitest';
import { documentStatusService } from '../../server/services/documentStatusService';
import { db } from '../../server/db';

// Мокаем базу данных
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  }
}));

// Мокаем timeUtils
vi.mock('@shared/timeUtils', () => ({
  getMoscowTime: vi.fn(() => new Date('2025-07-01T14:30:00.000Z')),
}));

// Мокаем logger
vi.mock('@shared/logger', () => ({
  inventoryLogger: {
    startOperation: vi.fn(() => vi.fn()),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  getErrorMessage: vi.fn((error) => error.message),
}));

describe('DocumentStatusService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('postDocument', () => {
    it('should post a draft document successfully', async () => {
      // Мокаем данные документа в статусе draft
      const mockDocument = {
        id: 1,
        name: 'Тест документ',
        type: 'Оприходование',
        status: 'draft',
        warehouseId: 1,
        createdAt: new Date(),
        postedAt: null,
      };

      // Мокаем позиции документа
      const mockItems = [
        { id: 1, documentId: 1, productId: 1, quantity: '10', price: '100' },
        { id: 2, documentId: 1, productId: 2, quantity: '5', price: '200' },
      ];

      // Мокаем транзакцию
      const mockTransaction = vi.fn(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockDocument]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ ...mockDocument, status: 'posted' }]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        
        // Первый вызов select возвращает документ, второй - позиции
        mockTx.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockDocument]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockItems),
            }),
          });
        
        return await callback(mockTx);
      });

      (db.transaction as any).mockImplementation(mockTransaction);

      // Выполняем тест
      const result = await documentStatusService.postDocument(1);

      // Проверяем результат
      expect(result).toEqual({ ...mockDocument, status: 'posted' });
      expect(db.transaction).toHaveBeenCalledOnce();
    });

    it('should return undefined if document not found', async () => {
      const mockTransaction = vi.fn(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]), // Документ не найден
            }),
          }),
        };
        return await callback(mockTx);
      });

      (db.transaction as any).mockImplementation(mockTransaction);

      const result = await documentStatusService.postDocument(999);
      expect(result).toBeUndefined();
    });

    it('should return document if already posted', async () => {
      const mockDocument = {
        id: 1,
        status: 'posted',
        postedAt: new Date(),
      };

      const mockTransaction = vi.fn(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockDocument]),
            }),
          }),
        };
        return await callback(mockTx);
      });

      (db.transaction as any).mockImplementation(mockTransaction);

      const result = await documentStatusService.postDocument(1);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('unpostDocument', () => {
    it('should unpost a posted document successfully', async () => {
      const mockDocument = {
        id: 1,
        name: 'Тест документ',
        type: 'Оприходование',
        status: 'posted',
        warehouseId: 1,
        createdAt: new Date(),
        postedAt: new Date(),
      };

      const mockTransaction = vi.fn(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockDocument]),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ ...mockDocument, status: 'draft', postedAt: null }]),
              }),
            }),
          }),
        };
        return await callback(mockTx);
      });

      (db.transaction as any).mockImplementation(mockTransaction);

      const result = await documentStatusService.unpostDocument(1);
      expect(result).toEqual({ ...mockDocument, status: 'draft', postedAt: null });
    });

    it('should return document if already in draft status', async () => {
      const mockDocument = {
        id: 1,
        status: 'draft',
        postedAt: null,
      };

      const mockTransaction = vi.fn(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockDocument]),
            }),
          }),
        };
        return await callback(mockTx);
      });

      (db.transaction as any).mockImplementation(mockTransaction);

      const result = await documentStatusService.unpostDocument(1);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('toggleDocumentStatus', () => {
    it('should toggle from draft to posted', async () => {
      const mockDocument = {
        id: 1,
        status: 'draft',
      };

      // Мокаем вызов select для получения документа
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockDocument]),
        }),
      });

      // Мокаем postDocument
      const postDocumentSpy = vi.spyOn(documentStatusService, 'postDocument')
        .mockResolvedValue({ ...mockDocument, status: 'posted' } as any);

      const result = await documentStatusService.toggleDocumentStatus(1);
      
      expect(postDocumentSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual({ ...mockDocument, status: 'posted' });
    });

    it('should toggle from posted to draft', async () => {
      const mockDocument = {
        id: 1,
        status: 'posted',
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockDocument]),
        }),
      });

      const unpostDocumentSpy = vi.spyOn(documentStatusService, 'unpostDocument')
        .mockResolvedValue({ ...mockDocument, status: 'draft' } as any);

      const result = await documentStatusService.toggleDocumentStatus(1);
      
      expect(unpostDocumentSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual({ ...mockDocument, status: 'draft' });
    });
  });

  describe('getDocumentStatusStats', () => {
    it('should return correct document status statistics', async () => {
      const mockStats = [
        { status: 'draft', count: 5 },
        { status: 'posted', count: 3 },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(mockStats),
        }),
      });

      const result = await documentStatusService.getDocumentStatusStats();
      
      expect(result).toEqual({
        draft: 5,
        posted: 3,
        total: 8,
      });
    });

    it('should handle empty statistics', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await documentStatusService.getDocumentStatusStats();
      
      expect(result).toEqual({
        draft: 0,
        posted: 0,
        total: 0,
      });
    });
  });
});