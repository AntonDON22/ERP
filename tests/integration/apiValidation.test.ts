/**
 * 🧪 Тесты проверки структуры API ответов
 * 
 * Валидация унифицированных полей API согласно ТЗ:
 * - Проверка наличия стандартных полей (id, name, quantity, reserved, available)
 * - Отсутствие полей БД (product_id, product_name, total_quantity и т.д.)
 */

import { describe, it, expect } from 'vitest';
import { validateApiResponse } from '@shared/apiNormalizer';

describe('API Response Validation', () => {
  
  describe('GET /api/inventory/availability', () => {
    it('should return only normalized API fields', async () => {
      const response = await fetch('http://localhost:5000/api/inventory/availability');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      
      // Применяем централизованную валидацию API
      validateApiResponse(data);
      
      // Проверяем каждый элемент на наличие правильных полей
      for (const item of data) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('quantity');
        
        // Проверяем типы данных
        expect(typeof item.id).toBe('number');
        expect(typeof item.name).toBe('string');
        expect(typeof item.quantity).toBe('number');
        
        // Опциональные поля
        if (item.hasOwnProperty('reserved')) {
          expect(typeof item.reserved).toBe('number');
        }
        if (item.hasOwnProperty('available')) {
          expect(typeof item.available).toBe('number');
        }
        
        // Запрещенные поля БД не должны присутствовать
        expect(item).not.toHaveProperty('product_id');
        expect(item).not.toHaveProperty('product_name');
        expect(item).not.toHaveProperty('total_quantity');
        expect(item).not.toHaveProperty('reserved_quantity');
        expect(item).not.toHaveProperty('available_quantity');
      }
    });
  });

  describe('GET /api/inventory', () => {
    it('should return only normalized API fields', async () => {
      const response = await fetch('http://localhost:5000/api/inventory');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      
      // Применяем централизованную валидацию API
      validateApiResponse(data);
      
      // Проверяем каждый элемент
      for (const item of data) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('quantity');
        
        // Проверяем типы данных
        expect(typeof item.id).toBe('number');
        expect(typeof item.name).toBe('string');
        expect(typeof item.quantity).toBe('number');
        
        // Запрещенные поля БД не должны присутствовать
        expect(item).not.toHaveProperty('product_id');
        expect(item).not.toHaveProperty('product_name');
        expect(item).not.toHaveProperty('total_quantity');
      }
    });
  });

  describe('API Response Format Consistency', () => {
    it('should maintain consistent field names across all inventory endpoints', async () => {
      // Тестируем несколько endpoints на согласованность
      const endpoints = [
        '/api/inventory',
        '/api/inventory/availability'
      ];
      
      for (const endpoint of endpoints) {
        const response = await fetch(`http://localhost:5000${endpoint}`);
        expect(response.ok).toBe(true);
        
        const data = await response.json();
        
        if (data.length > 0) {
          const item = data[0];
          
          // Обязательные поля должны быть везде
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('quantity');
          
          // ID должен быть числом
          expect(typeof item.id).toBe('number');
          expect(item.id).toBeGreaterThan(0);
          
          // Name должно быть непустой строкой
          expect(typeof item.name).toBe('string');
          expect(item.name.length).toBeGreaterThan(0);
          
          // Quantity должно быть числом
          expect(typeof item.quantity).toBe('number');
          expect(item.quantity).toBeGreaterThanOrEqual(0);
        }
      }
    });
    
    it('should reject responses with forbidden database fields', () => {
      // Тест функции валидации с неправильными данными
      const invalidData = [
        {
          id: 1,
          name: 'Test Product',
          quantity: 10,
          product_id: 1, // запрещенное поле БД
        },
        {
          id: 2,
          name: 'Test Product 2',
          quantity: 5,
          product_name: 'Another Name', // запрещенное поле БД
        }
      ];
      
      expect(() => validateApiResponse(invalidData)).toThrow(/запрещенное поле/);
    });
    
    it('should reject responses without required fields', () => {
      // Тест функции валидации с отсутствующими полями
      const invalidData = [
        {
          // отсутствует id
          name: 'Test Product',
          quantity: 10,
        },
        {
          id: 2,
          // отсутствует name
          quantity: 5,
        }
      ];
      
      expect(() => validateApiResponse(invalidData)).toThrow(/отсутствует поле/);
    });
  });
});