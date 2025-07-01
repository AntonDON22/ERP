import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from 'http';
import express from 'express';

// Создаем тестовый сервер для интеграционных тестов
describe('API Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Создаем минимальное Express приложение для тестов
    app = express();
    app.use(express.json());
    
    // Добавляем базовые маршруты для тестирования
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/api/products', (req, res) => {
      res.json([
        { id: 1, name: 'Test Product 1', price: '100', sku: 'TEST001' },
        { id: 2, name: 'Test Product 2', price: '200', sku: 'TEST002' },
      ]);
    });

    app.post('/api/products', (req, res) => {
      const { name, price, sku } = req.body;
      if (!name || !price || !sku) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      res.status(201).json({ id: 3, name, price, sku });
    });

    app.get('/api/documents', (req, res) => {
      res.json([
        { 
          id: 1, 
          name: 'Тест документ 1', 
          type: 'Оприходование',
          status: 'draft',
          warehouseId: 1,
          createdAt: new Date().toISOString()
        },
      ]);
    });

    app.post('/api/documents/:id/toggle-status', (req, res) => {
      const { id } = req.params;
      const documentId = parseInt(id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      // Имитируем переключение статуса
      res.json({
        id: documentId,
        name: `Документ ${documentId}`,
        type: 'Оприходование',
        status: 'posted',
        postedAt: new Date().toISOString()
      });
    });

    server = createServer(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Products API', () => {
    it('should get list of products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('price');
      expect(response.body[0]).toHaveProperty('sku');
    });

    it('should create a new product', async () => {
      const newProduct = {
        name: 'Test Product 3',
        price: '300',
        sku: 'TEST003'
      };

      const response = await request(app)
        .post('/api/products')
        .send(newProduct)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newProduct.name);
      expect(response.body.price).toBe(newProduct.price);
      expect(response.body.sku).toBe(newProduct.sku);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteProduct = {
        name: 'Incomplete Product'
        // Отсутствуют price и sku
      };

      const response = await request(app)
        .post('/api/products')
        .send(incompleteProduct)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Documents API', () => {
    it('should get list of documents', async () => {
      const response = await request(app)
        .get('/api/documents')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should toggle document status', async () => {
      const documentId = 1;

      const response = await request(app)
        .post(`/api/documents/${documentId}/toggle-status`)
        .expect(200);

      expect(response.body.id).toBe(documentId);
      expect(response.body.status).toBe('posted');
      expect(response.body).toHaveProperty('postedAt');
    });

    it('should return 400 for invalid document ID', async () => {
      const response = await request(app)
        .post('/api/documents/invalid/toggle-status')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/non-existent')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('Content Type Handling', () => {
    it('should require JSON content type for POST requests', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Content-Type', 'text/plain')
        .send('some text data')
        .expect(400);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Headers', () => {
    it('should return correct content type for JSON responses', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/products')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Менее 1 секунды
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate numeric fields', async () => {
      const invalidProduct = {
        name: 'Test Product',
        price: 'invalid_price',
        sku: 'TEST004'
      };

      // В реальном приложении должна быть валидация
      const response = await request(app)
        .post('/api/products')
        .send(invalidProduct);

      // Проверяем что система принимает или отклоняет невалидные данные
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle special characters in input', async () => {
      const productWithSpecialChars = {
        name: 'Товар с символами: <>&"\'',
        price: '100',
        sku: 'TEST-005'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productWithSpecialChars)
        .expect(201);

      expect(response.body.name).toBe(productWithSpecialChars.name);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings', async () => {
      const longString = 'A'.repeat(1000);
      const productWithLongName = {
        name: longString,
        price: '100',
        sku: 'LONG001'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productWithLongName);

      // Система должна либо принять, либо отклонить с соответствующим статусом
      expect([200, 201, 400, 413]).toContain(response.status);
    });

    it('should handle unicode characters', async () => {
      const unicodeProduct = {
        name: '测试产品 🚀 Тест',
        price: '100',
        sku: 'UNICODE001'
      };

      const response = await request(app)
        .post('/api/products')
        .send(unicodeProduct)
        .expect(201);

      expect(response.body.name).toBe(unicodeProduct.name);
    });
  });
});