import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { zPrice, zQuantity, zQuantityInteger, zWeight, zId } from '../../shared/zFields';

/**
 * Комплексные тесты валидации схем
 * Проверяют все проблемные места в системе, которые требуют миграции на zFields.ts
 */

describe('Schema Validation Tests', () => {
  
  describe('zFields.ts Coverage Tests', () => {
    
    it('should validate all zFields correctly', () => {
      // Тест zId
      expect(zId.parse(1)).toBe(1);
      expect(zId.parse("123")).toBe(123);
      expect(() => zId.parse(0)).toThrow();
      expect(() => zId.parse(-1)).toThrow();
      expect(() => zId.parse("")).toThrow();
      expect(() => zId.parse("abc")).toThrow();
      
      // Тест zPrice
      expect(zPrice.parse(10.5)).toBe(10.5);
      expect(zPrice.parse("10.5")).toBe(10.5);
      expect(() => zPrice.parse(-1)).toThrow();
      expect(() => zPrice.parse("")).toThrow();
      
      // Тест zQuantity  
      expect(zQuantity.parse(5.5)).toBe(5.5);
      expect(zQuantity.parse("5.5")).toBe(5.5);
      expect(() => zQuantity.parse(-1)).toThrow();
      expect(() => zQuantity.parse("")).toThrow();
      
      // Тест zQuantityInteger
      expect(zQuantityInteger.parse(5)).toBe(5);
      expect(zQuantityInteger.parse("5")).toBe(5);
      expect(() => zQuantityInteger.parse(5.5)).toThrow();
      expect(() => zQuantityInteger.parse(-1)).toThrow();
      expect(() => zQuantityInteger.parse("")).toThrow();
    });
    
    it('should validate unified number fields correctly', () => {
      // Тест zWeight
      expect(zWeight.parse(10.5)).toBe(10.5);
      expect(zWeight.parse("10.5")).toBe(10.5);
      expect(zWeight.parse(0)).toBe(0);
      expect(zWeight.parse("0")).toBe(0);
      expect(() => zWeight.parse(-1)).toThrow();
      expect(() => zWeight.parse("-1")).toThrow();
    });
  });
  
  describe('Manual Validation Problems Identification', () => {
    
    it('should identify documents warehouseId manual validation issue', () => {
      // Тестируем проблему из shared/schema.ts строка 166-169
      const manualValidation = z.number()
        .positive("ID склада должен быть положительным числом")
        .int("ID склада должен быть целым числом")
        .optional();
      
      const unifiedValidation = zId.optional();
      
      // Тест одинаковых результатов
      expect(manualValidation.parse(1)).toBe(1);
      expect(unifiedValidation.parse(1)).toBe(1);
      expect(manualValidation.parse(undefined)).toBe(undefined);
      expect(unifiedValidation.parse(undefined)).toBe(undefined);
      
      // Тест ошибок
      expect(() => manualValidation.parse(-1)).toThrow();
      expect(() => unifiedValidation.parse(-1)).toThrow();
      expect(() => manualValidation.parse(0)).toThrow();
      expect(() => unifiedValidation.parse(0)).toThrow();
    });
    
    it('should identify receiptDocumentSchema name manual validation issue', () => {
      // Тестируем проблему из shared/schema.ts строка 245
      const manualValidation = z.string().min(1, "Название документа обязательно");
      
      // Предлагаемое решение - унифицировать через zFields
      const suggestedValidation = z.string().min(1, "Название обязательно").trim();
      
      // Тест одинаковых результатов
      expect(manualValidation.parse("Test")).toBe("Test");
      expect(suggestedValidation.parse("Test")).toBe("Test");
      
      // Тест ошибок
      expect(() => manualValidation.parse("")).toThrow();
      expect(() => suggestedValidation.parse("")).toThrow();
    });
    
    it('should identify order schema manual validation issues', () => {
      // Тестируем проблему из shared/schema.ts строка 280-284
      const manualNameValidation = z.string()
        .min(1, "Название заказа обязательно")
        .max(255, "Название не должно превышать 255 символов")
        .trim()
        .optional();
      
      // Тестируем проблему из shared/schema.ts строка 291-294
      const manualNotesValidation = z.string()
        .optional()
        .refine(val => !val || val.length <= 1000, "Примечания не должны превышать 1000 символов")
        .transform(val => val?.trim() || undefined);
      
      // Тестируем проблему из shared/schema.ts строка 295-297
      const manualDateValidation = z.string()
        .optional()
        .refine(val => !val || !isNaN(Date.parse(val)), "Некорректная дата");
      
      // Тест правильной работы
      expect(manualNameValidation.parse("Test")).toBe("Test");
      expect(manualNameValidation.parse(undefined)).toBe(undefined);
      expect(manualNotesValidation.parse("Test")).toBe("Test");
      expect(manualNotesValidation.parse(undefined)).toBe(undefined);
      expect(manualDateValidation.parse("2025-01-01")).toBe("2025-01-01");
      expect(manualDateValidation.parse(undefined)).toBe(undefined);
      
      // Тест ошибок
      expect(() => manualNameValidation.parse("")).toThrow();
      expect(() => manualNotesValidation.parse("a".repeat(1001))).toThrow();
      expect(() => manualDateValidation.parse("invalid-date")).toThrow();
    });
    
    it('should identify orderSchema status manual validation issue', () => {
      // Тестируем проблему из shared/schema.ts строка 343
      const manualValidation = z.string();
      
      // Предлагаемое решение - enum валидация
      const suggestedValidation = z.enum(['Новый', 'В работе', 'Выполнен', 'Отменен']);
      
      // Тест правильной работы
      expect(manualValidation.parse("Test")).toBe("Test");
      expect(suggestedValidation.parse("Новый")).toBe("Новый");
      
      // Тест ошибок
      expect(() => suggestedValidation.parse("Invalid")).toThrow();
    });
  });
  
  describe('Middleware Validation Problems Identification', () => {
    
    it('should identify idParamSchema manual validation issue', () => {
      // Тестируем проблему из server/middleware/validation.ts строка 91-96
      const manualValidation = z.object({
        id: z.string()
          .regex(/^\d+$/, "ID должен содержать только цифры")
          .transform(Number)
          .refine(val => val > 0, "ID должен быть положительным")
      });
      
      const unifiedValidation = z.object({
        id: z.string()
          .regex(/^\d+$/, "ID должен содержать только цифры")
          .transform(Number)
          .pipe(zId)
      });
      
      // Тест одинаковых результатов
      expect(manualValidation.parse({id: "123"})).toEqual({id: 123});
      expect(unifiedValidation.parse({id: "123"})).toEqual({id: 123});
      
      // Тест ошибок
      expect(() => manualValidation.parse({id: "0"})).toThrow();
      expect(() => unifiedValidation.parse({id: "0"})).toThrow();
      expect(() => manualValidation.parse({id: "-1"})).toThrow();
      expect(() => unifiedValidation.parse({id: "-1"})).toThrow();
    });
    
    it('should identify array IDs schema manual validation issue', () => {
      // Тестируем проблему из server/middleware/validation.ts строка 103-106
      const manualValidation = z.object({
        productIds: z.array(
          z.number()
            .positive("ID должен быть положительным")
            .int("ID должен быть целым числом")
        ).min(1, "Укажите хотя бы один ID товара")
      });
      
      const unifiedValidation = z.object({
        productIds: z.array(zId).min(1, "Укажите хотя бы один ID товара")
      });
      
      // Тест одинаковых результатов
      expect(manualValidation.parse({productIds: [1, 2, 3]})).toEqual({productIds: [1, 2, 3]});
      expect(unifiedValidation.parse({productIds: [1, 2, 3]})).toEqual({productIds: [1, 2, 3]});
      
      // Тест ошибок
      expect(() => manualValidation.parse({productIds: []})).toThrow();
      expect(() => unifiedValidation.parse({productIds: []})).toThrow();
      expect(() => manualValidation.parse({productIds: [0]})).toThrow();
      expect(() => unifiedValidation.parse({productIds: [0]})).toThrow();
      expect(() => manualValidation.parse({productIds: [-1]})).toThrow();
      expect(() => unifiedValidation.parse({productIds: [-1]})).toThrow();
    });
  });
  
  describe('Comprehensive Schema Consistency Tests', () => {
    
    it('should ensure all ID validations use same rules', () => {
      const testValues = [1, 123, "1", "123"];
      const errorValues = [0, -1, "", "0", "-1", "abc", null, undefined];
      
      for (const value of testValues) {
        expect(() => zId.parse(value)).not.toThrow();
      }
      
      for (const value of errorValues) {
        expect(() => zId.parse(value)).toThrow();
      }
    });
    
    it('should ensure all price validations use same rules', () => {
      const testValues = [0, 1, 123.45, "0", "1", "123.45"];
      const errorValues = [-1, "", "-1", "abc", null, undefined];
      
      for (const value of testValues) {
        expect(() => zPrice.parse(value)).not.toThrow();
      }
      
      for (const value of errorValues) {
        expect(() => zPrice.parse(value)).toThrow();
      }
    });
    
    it('should ensure all quantity validations use same rules', () => {
      const testValues = [1, 123.45, "1", "123.45"]; // Удален ноль - zQuantity требует > 0
      const errorValues = [0, -1, "", "0", "-1", "abc", null, undefined]; // Добавлен ноль в ошибки
      
      for (const value of testValues) {
        expect(() => zQuantity.parse(value)).not.toThrow();
      }
      
      for (const value of errorValues) {
        expect(() => zQuantity.parse(value)).toThrow();
      }
    });
  });
  
  describe('Migration Readiness Tests', () => {
    
    it('should verify zFields can replace all manual validations', () => {
      // Проверяем, что все типы валидации покрыты zFields
      const zFieldsTypes = [
        zId, zPrice, zQuantity, zQuantityInteger
      ];
      
      for (const field of zFieldsTypes) {
        expect(field).toBeDefined();
        expect(typeof field.parse).toBe('function');
      }
    });
    
    it('should verify Russian error messages consistency', () => {
      // Проверяем, что русские сообщения об ошибках единообразны
      try {
        zId.parse(-1);
      } catch (error: any) {
        expect(error.issues[0].message).toContain('положительным');
      }
      
      try {
        zPrice.parse(-1);
      } catch (error: any) {
        expect(error.issues[0].message).toContain('отрицательной');
      }
      
      try {
        zQuantity.parse(-1);
      } catch (error: any) {
        expect(error.issues[0].message).toContain('больше нуля'); // zQuantity теперь требует > 0
      }
    });
  });
});