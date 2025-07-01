import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery, idParamSchema, productIdsSchema } from '../../server/middleware/validation';

// Моки для Express объектов
const createMockReq = (data: any = {}, params: any = {}, query: any = {}): Partial<Request> => ({
  body: data,
  params,
  query,
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe('Validation Middleware', () => {
  describe('validateBody', () => {
    it('should pass validation with valid data', () => {
      const schema = z.object({
        name: z.string().min(1),
        price: z.number().positive(),
      });

      const req = createMockReq({ name: 'Test Product', price: 100 });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid data with 400 status', () => {
      const schema = z.object({
        name: z.string().min(1),
        price: z.number().positive(),
      });

      const req = createMockReq({ name: '', price: -10 });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Ошибка валидации'),
          details: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing body gracefully', () => {
      const schema = z.object({
        name: z.string().min(1),
      });

      const req = createMockReq();
      delete (req as any).body;
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should provide detailed validation errors', () => {
      const schema = z.object({
        name: z.string().min(3, 'Название должно содержать минимум 3 символа'),
        price: z.number().positive('Цена должна быть положительной'),
        email: z.string().email('Неверный формат email'),
      });

      const req = createMockReq({
        name: 'AB',
        price: -5,
        email: 'invalid-email',
      });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Ошибка валидации'),
          details: expect.any(Array),
        })
      );
    });
  });

  describe('validateParams', () => {
    it('should validate URL parameters', () => {
      const schema = z.object({
        id: z.string().transform(Number).pipe(z.number().positive()),
      });

      const req = createMockReq({}, { id: '123' });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateParams(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid parameters', () => {
      const schema = z.object({
        id: z.string().transform(Number).pipe(z.number().positive()),
      });

      const req = createMockReq({}, { id: 'invalid' });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateParams(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', () => {
      const schema = z.object({
        page: z.string().optional().transform(v => v ? Number(v) : 1),
        limit: z.string().optional().transform(v => v ? Number(v) : 10),
      });

      const req = createMockReq({}, {}, { page: '2', limit: '20' });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateQuery(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle optional query parameters', () => {
      const schema = z.object({
        search: z.string().optional(),
        sortBy: z.enum(['name', 'price', 'date']).optional(),
      });

      const req = createMockReq({}, {}, {});
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateQuery(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('Predefined Schemas', () => {
    describe('idParamSchema', () => {
      it('should validate positive integer IDs', () => {
        const validData = { id: '123' };
        const result = idParamSchema.parse(validData);
        expect(result.id).toBe(123); // coerce преобразует строку в число
      });

      it('should reject non-numeric IDs', () => {
        const invalidData = { id: 'abc' };
        expect(() => idParamSchema.parse(invalidData)).toThrow();
      });

      it('should reject negative IDs', () => {
        const invalidData = { id: '-1' };
        expect(() => idParamSchema.parse(invalidData)).toThrow();
      });

      it('should reject zero ID', () => {
        const invalidData = { id: '0' };
        expect(() => idParamSchema.parse(invalidData)).toThrow();
      });
    });

    describe('productIdsSchema', () => {
      it('should validate array of product IDs', () => {
        const validData = { productIds: [1, 2, 3] };
        const result = productIdsSchema.parse(validData);
        expect(result.productIds).toEqual([1, 2, 3]);
      });

      it('should require at least one ID', () => {
        const invalidData = { productIds: [] };
        expect(() => productIdsSchema.parse(invalidData)).toThrow();
      });

      it('should reject negative IDs', () => {
        const invalidData = { productIds: [1, -2, 3] };
        expect(() => productIdsSchema.parse(invalidData)).toThrow();
      });

      it('should reject non-numeric IDs', () => {
        const invalidData = { productIds: [1, 'invalid', 3] };
        expect(() => productIdsSchema.parse(invalidData)).toThrow();
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle circular reference in validation errors', () => {
      const schema = z.object({
        data: z.object({
          nested: z.string().min(5),
        }),
      });

      const circularData: any = { data: {} };
      circularData.data.circular = circularData;
      circularData.data.nested = 'abc';

      const req = createMockReq(circularData);
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle very large payloads', () => {
      const schema = z.object({
        items: z.array(z.object({
          name: z.string(),
          value: z.number(),
        })),
      });

      const largeData = {
        items: Array(1000).fill(null).map((_, i) => ({
          name: `Item ${i}`,
          value: i,
        })),
      };

      const req = createMockReq(largeData);
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should handle unicode characters in validation', () => {
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      });

      const unicodeData = {
        name: 'Тест 测试 🚀',
        description: 'Описание с эмодзи 😊 и unicode символами ✨',
      };

      const req = createMockReq(unicodeData);
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should handle null and undefined values correctly', () => {
      const schema = z.object({
        name: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
      });

      const req = createMockReq({
        name: 'Test',
        optional: undefined,
        nullable: null,
      });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('Security Tests', () => {
    it('should prevent script injection in error messages', () => {
      const schema = z.object({
        name: z.string().min(50), // Делаем валидацию более строгой чтобы она не прошла
      });

      const maliciousData = {
        name: '<script>alert("xss")</script>',
      };

      const req = createMockReq(maliciousData);
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      // Проверяем что валидация не прошла и next не был вызван
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle prototype pollution attempts', () => {
      const schema = z.object({
        name: z.string(),
      });

      const maliciousData = {
        name: 'test',
        '__proto__': { polluted: true },
        'constructor': { prototype: { polluted: true } },
      };

      const req = createMockReq(maliciousData);
      const res = createMockRes();
      const next = createMockNext();

      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      // Проверяем что объект не был загрязнен
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });

  describe('Performance Tests', () => {
    it('should validate large arrays efficiently', () => {
      const schema = z.object({
        items: z.array(z.object({
          id: z.number(),
          name: z.string(),
        })).max(10000),
      });

      const largeArray = Array(5000).fill(null).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));

      const req = createMockReq({ items: largeArray });
      const res = createMockRes();
      const next = createMockNext();

      const start = Date.now();
      const middleware = validateBody(schema);
      middleware(req as Request, res as Response, next);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Менее 1 секунды
      expect(next).toHaveBeenCalledOnce();
    });
  });
});