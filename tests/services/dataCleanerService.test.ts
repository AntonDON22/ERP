import { describe, it, expect } from 'vitest';
import { DataCleanerService } from '../../server/services/dataCleanerService';

describe('DataCleanerService', () => {
  describe('cleanNumericValue', () => {
    it('should clean currency symbols', () => {
      expect(DataCleanerService.cleanNumericValue('₽123.45')).toBe('123.45');
      expect(DataCleanerService.cleanNumericValue('$100.00')).toBe('100.00');
      expect(DataCleanerService.cleanNumericValue('€50.25')).toBe('50.25');
      expect(DataCleanerService.cleanNumericValue('123руб.')).toBe('123');
    });

    it('should clean measurement units', () => {
      expect(DataCleanerService.cleanNumericValue('100г')).toBe('100');
      expect(DataCleanerService.cleanNumericValue('2.5кг')).toBe('2.5');
      expect(DataCleanerService.cleanNumericValue('150мм')).toBe('150');
      expect(DataCleanerService.cleanNumericValue('5см')).toBe('5');
      expect(DataCleanerService.cleanNumericValue('1.2м')).toBe('1.2');
    });

    it('should handle whitespace', () => {
      expect(DataCleanerService.cleanNumericValue('  123.45  ')).toBe('123.45');
      expect(DataCleanerService.cleanNumericValue('₽ 100 ')).toBe('100');
      expect(DataCleanerService.cleanNumericValue(' 50 г ')).toBe('50');
    });

    it('should handle comma decimal separators', () => {
      expect(DataCleanerService.cleanNumericValue('123,45')).toBe('123.45');
      expect(DataCleanerService.cleanNumericValue('₽1 000,50')).toBe('1000.50');
    });

    it('should remove thousand separators', () => {
      expect(DataCleanerService.cleanNumericValue('1 000')).toBe('1000');
      expect(DataCleanerService.cleanNumericValue('10,000.50')).toBe('10000.50');
      expect(DataCleanerService.cleanNumericValue('1 234 567,89')).toBe('1234567.89');
    });

    it('should handle negative numbers', () => {
      expect(DataCleanerService.cleanNumericValue('-123.45')).toBe('-123.45');
      expect(DataCleanerService.cleanNumericValue('(100)')).toBe('-100');
    });

    it('should handle empty and invalid values', () => {
      expect(DataCleanerService.cleanNumericValue('')).toBe('0');
      expect(DataCleanerService.cleanNumericValue(null)).toBe('0');
      expect(DataCleanerService.cleanNumericValue(undefined)).toBe('0');
      expect(DataCleanerService.cleanNumericValue('abc')).toBe('0');
    });

    it('should preserve valid numeric strings', () => {
      expect(DataCleanerService.cleanNumericValue('123.45')).toBe('123.45');
      expect(DataCleanerService.cleanNumericValue('0')).toBe('0');
      expect(DataCleanerService.cleanNumericValue('100')).toBe('100');
    });

    it('should handle complex real-world examples', () => {
      expect(DataCleanerService.cleanNumericValue('₽1 234,56 руб.')).toBe('1234.56');
      expect(DataCleanerService.cleanNumericValue('2,5 кг.')).toBe('2.5');
      expect(DataCleanerService.cleanNumericValue('€ 999,99')).toBe('999.99');
    });
  });

  describe('cleanTextValue', () => {
    it('should trim whitespace', () => {
      expect(DataCleanerService.cleanTextValue('  test  ')).toBe('test');
      expect(DataCleanerService.cleanTextValue('\n\t test \n\t')).toBe('test');
    });

    it('should handle empty values', () => {
      expect(DataCleanerService.cleanTextValue('')).toBe('');
      expect(DataCleanerService.cleanTextValue(null)).toBe('');
      expect(DataCleanerService.cleanTextValue(undefined)).toBe('');
    });

    it('should preserve special characters in text', () => {
      expect(DataCleanerService.cleanTextValue('Товар №1')).toBe('Товар №1');
      expect(DataCleanerService.cleanTextValue('Test & Co.')).toBe('Test & Co.');
    });

    it('should handle unicode characters', () => {
      expect(DataCleanerService.cleanTextValue('Тест 测试 🚀')).toBe('Тест 测试 🚀');
    });
  });

  describe('validateNumericFields', () => {
    it('should validate price field', () => {
      const data = { price: 'abc', weight: '100' };
      const errors = DataCleanerService.validateNumericFields(data);
      
      expect(errors.price).toBe('Цена должна быть числом');
      expect(errors.weight).toBeUndefined();
    });

    it('should validate weight field', () => {
      const data = { weight: 'invalid', price: '100' };
      const errors = DataCleanerService.validateNumericFields(data);
      
      expect(errors.weight).toBe('Вес должен быть числом');
      expect(errors.price).toBeUndefined();
    });

    it('should validate dimension fields', () => {
      const data = { 
        width: 'abc', 
        height: 'def', 
        depth: 'xyz',
        price: '100'
      };
      const errors = DataCleanerService.validateNumericFields(data);
      
      expect(errors.width).toBe('Ширина должна быть числом');
      expect(errors.height).toBe('Высота должна быть числом');
      expect(errors.depth).toBe('Глубина должна быть числом');
    });

    it('should return empty object for valid data', () => {
      const data = { 
        price: '100.50',
        weight: '2.5',
        width: '10',
        height: '20',
        depth: '30'
      };
      const errors = DataCleanerService.validateNumericFields(data);
      
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should handle fields with currency and units', () => {
      const data = { 
        price: '₽100.50',
        weight: '2.5кг',
        width: '10мм'
      };
      const errors = DataCleanerService.validateNumericFields(data);
      
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('sanitizeProductData', () => {
    it('should clean all numeric fields in product data', () => {
      const productData = {
        name: '  Test Product  ',
        price: '₽100,50',
        weight: '2,5кг',
        width: '10 мм',
        height: '20см',
        depth: '5 м',
        sku: 'TEST001',
        barcode: '123456789'
      };

      const sanitized = DataCleanerService.sanitizeProductData(productData);

      expect(sanitized.name).toBe('Test Product');
      expect(sanitized.price).toBe('100.50');
      expect(sanitized.weight).toBe('2.5');
      expect(sanitized.width).toBe('10');
      expect(sanitized.height).toBe('20');
      expect(sanitized.depth).toBe('5');
      expect(sanitized.sku).toBe('TEST001');
      expect(sanitized.barcode).toBe('123456789');
    });

    it('should handle missing fields gracefully', () => {
      const productData = {
        name: 'Test Product',
        price: '100'
      };

      const sanitized = DataCleanerService.sanitizeProductData(productData);

      expect(sanitized.name).toBe('Test Product');
      expect(sanitized.price).toBe('100');
      expect(sanitized.weight).toBe('0');
      expect(sanitized.width).toBe('0');
      expect(sanitized.height).toBe('0');
      expect(sanitized.depth).toBe('0');
    });

    it('should preserve non-numeric fields as-is', () => {
      const productData = {
        name: 'Сложный Товар №1',
        sku: 'SKU-001',
        barcode: '1234567890123',
        price: '100'
      };

      const sanitized = DataCleanerService.sanitizeProductData(productData);

      expect(sanitized.name).toBe('Сложный Товар №1');
      expect(sanitized.sku).toBe('SKU-001');
      expect(sanitized.barcode).toBe('1234567890123');
    });
  });

  describe('Edge Cases and Real-World Scenarios', () => {
    it('should handle Excel-formatted numbers', () => {
      // Excel может экспортировать числа с апострофами
      expect(DataCleanerService.cleanNumericValue("'123.45")).toBe('123.45');
      expect(DataCleanerService.cleanNumericValue('="100"')).toBe('100');
    });

    it('should handle scientific notation', () => {
      expect(DataCleanerService.cleanNumericValue('1.5e2')).toBe('150');
      expect(DataCleanerService.cleanNumericValue('2.5E-1')).toBe('0.25');
    });

    it('should handle percentage values', () => {
      expect(DataCleanerService.cleanNumericValue('50%')).toBe('50');
      expect(DataCleanerService.cleanNumericValue('12.5%')).toBe('12.5');
    });

    it('should handle multiple currency symbols', () => {
      expect(DataCleanerService.cleanNumericValue('USD$100')).toBe('100');
      expect(DataCleanerService.cleanNumericValue('RUB₽500')).toBe('500');
    });

    it('should handle fractional values', () => {
      expect(DataCleanerService.cleanNumericValue('1/2')).toBe('0.5');
      expect(DataCleanerService.cleanNumericValue('3/4')).toBe('0.75');
    });

    it('should handle very large numbers', () => {
      expect(DataCleanerService.cleanNumericValue('1 000 000,00')).toBe('1000000.00');
      expect(DataCleanerService.cleanNumericValue('₽9 999 999.99')).toBe('9999999.99');
    });

    it('should handle measurement abbreviations', () => {
      expect(DataCleanerService.cleanNumericValue('100mm')).toBe('100');
      expect(DataCleanerService.cleanNumericValue('2.5kg')).toBe('2.5');
      expect(DataCleanerService.cleanNumericValue('1.5m')).toBe('1.5');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        name: `Product ${i}`,
        price: `₽${i * 100},50`,
        weight: `${i}кг`,
      }));

      const start = Date.now();
      largeDataset.forEach(item => {
        DataCleanerService.sanitizeProductData(item);
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Менее 1 секунды для 1000 записей
    });
  });
});