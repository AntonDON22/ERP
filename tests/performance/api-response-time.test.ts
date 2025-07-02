/**
 * Тест времени ответа API endpoints
 * Измеряет производительность ключевых API маршрутов ERP-системы
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

interface ResponseTimeResult {
  endpoint: string;
  method: string;
  responseTime: number;
  status: 'excellent' | 'warning' | 'error';
  statusCode: number;
}

// Пороги производительности (в миллисекундах)
const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 100,
  WARNING: 500,
} as const;

// Цветовые коды для консоли
const COLORS = {
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
} as const;

describe('API Response Time Performance Tests', () => {
  let app: express.Application;
  const results: ResponseTimeResult[] = [];

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app as any);
  });

  /**
   * Измеряет время ответа API endpoint
   */
  async function measureResponseTime(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<ResponseTimeResult> {
    const startTime = Date.now();
    
    let response;
    if (method === 'GET') {
      response = await request(app).get(endpoint);
    } else {
      response = await request(app).post(endpoint).send(body);
    }
    
    const responseTime = Date.now() - startTime;
    
    let status: ResponseTimeResult['status'];
    if (responseTime <= PERFORMANCE_THRESHOLDS.EXCELLENT) {
      status = 'excellent';
    } else if (responseTime <= PERFORMANCE_THRESHOLDS.WARNING) {
      status = 'warning';
    } else {
      status = 'error';
    }

    const result: ResponseTimeResult = {
      endpoint,
      method,
      responseTime,
      status,
      statusCode: response.status,
    };

    results.push(result);
    return result;
  }

  /**
   * Форматирует результат с цветовой градацией
   */
  function formatResult(result: ResponseTimeResult): string {
    const { endpoint, method, responseTime, status } = result;
    
    let color: string;
    let statusText: string;
    
    switch (status) {
      case 'excellent':
        color = COLORS.GREEN;
        statusText = 'ОТЛИЧНО';
        break;
      case 'warning':
        color = COLORS.YELLOW;
        statusText = 'ПРЕДУПРЕЖДЕНИЕ';
        break;
      case 'error':
        color = COLORS.RED;
        statusText = 'ОШИБКА';
        break;
    }

    return `${color}${COLORS.BOLD}${method} ${endpoint}${COLORS.RESET}${color} - ${responseTime}ms [${statusText}]${COLORS.RESET}`;
  }

  describe('Ключевые API endpoints', () => {
    it('должен измерить время ответа /api/products', async () => {
      const result = await measureResponseTime('/api/products');
      
      console.log('\n📊 Результат замера:');
      console.log(formatResult(result));
      
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeGreaterThan(0);
      
      // Предупреждение если медленно, но не фейлим тест
      if (result.status === 'error') {
        console.warn(`⚠️  Медленный ответ: ${result.responseTime}ms превышает порог ${PERFORMANCE_THRESHOLDS.WARNING}ms`);
      }
    });

    it('должен измерить время ответа /api/inventory/availability', async () => {
      const result = await measureResponseTime('/api/inventory/availability');
      
      console.log('\n📊 Результат замера:');
      console.log(formatResult(result));
      
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeGreaterThan(0);
      
      if (result.status === 'error') {
        console.warn(`⚠️  Медленный ответ: ${result.responseTime}ms превышает порог ${PERFORMANCE_THRESHOLDS.WARNING}ms`);
      }
    });

    it('должен измерить время ответа /api/documents', async () => {
      const result = await measureResponseTime('/api/documents');
      
      console.log('\n📊 Результат замера:');
      console.log(formatResult(result));
      
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeGreaterThan(0);
      
      if (result.status === 'error') {
        console.warn(`⚠️  Медленный ответ: ${result.responseTime}ms превышает порог ${PERFORMANCE_THRESHOLDS.WARNING}ms`);
      }
    });

    it('должен измерить время ответа /api/warehouses', async () => {
      const result = await measureResponseTime('/api/warehouses');
      
      console.log('\n📊 Результат замера:');
      console.log(formatResult(result));
      
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeGreaterThan(0);
      
      if (result.status === 'error') {
        console.warn(`⚠️  Медленный ответ: ${result.responseTime}ms превышает порог ${PERFORMANCE_THRESHOLDS.WARNING}ms`);
      }
    });

    it('должен измерить время ответа /api/inventory', async () => {
      const result = await measureResponseTime('/api/inventory');
      
      console.log('\n📊 Результат замера:');
      console.log(formatResult(result));
      
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeGreaterThan(0);
      
      if (result.status === 'error') {
        console.warn(`⚠️  Медленный ответ: ${result.responseTime}ms превышает порог ${PERFORMANCE_THRESHOLDS.WARNING}ms`);
      }
    });
  });

  describe('Сводный отчет', () => {
    it('должен показать общую статистику производительности', () => {
      const totalTests = results.length;
      const excellentCount = results.filter(r => r.status === 'excellent').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      const averageTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
      const maxTime = Math.max(...results.map(r => r.responseTime));
      const minTime = Math.min(...results.map(r => r.responseTime));

      console.log('\n' + '='.repeat(60));
      console.log(`${COLORS.BOLD}📈 СВОДНЫЙ ОТЧЕТ ПРОИЗВОДИТЕЛЬНОСТИ API${COLORS.RESET}`);
      console.log('='.repeat(60));
      console.log(`📊 Всего тестов: ${totalTests}`);
      console.log(`${COLORS.GREEN}✅ Отличных: ${excellentCount} (<${PERFORMANCE_THRESHOLDS.EXCELLENT}ms)${COLORS.RESET}`);
      console.log(`${COLORS.YELLOW}⚠️  Предупреждений: ${warningCount} (${PERFORMANCE_THRESHOLDS.EXCELLENT}-${PERFORMANCE_THRESHOLDS.WARNING}ms)${COLORS.RESET}`);
      console.log(`${COLORS.RED}❌ Ошибок: ${errorCount} (>${PERFORMANCE_THRESHOLDS.WARNING}ms)${COLORS.RESET}`);
      console.log(`⏱️  Среднее время: ${averageTime.toFixed(1)}ms`);
      console.log(`🏃 Быстрейший: ${minTime}ms`);
      console.log(`🐌 Медленнейший: ${maxTime}ms`);
      console.log('='.repeat(60));

      // Детальная таблица результатов
      console.log('\n📋 Детальные результаты:');
      results.forEach(result => {
        console.log(`  ${formatResult(result)}`);
      });

      expect(totalTests).toBeGreaterThan(0);
      expect(averageTime).toBeGreaterThan(0);
    });
  });
});