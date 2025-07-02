/**
 * 🧪 Тесты маршрутизации API
 * 
 * Проверяет что несуществующие API-запросы возвращают JSON вместо HTML
 * и что существующие API продолжают работать корректно
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'http';
import express from 'express';
import { registerRoutes } from '../server/routes';

describe('API Routing Tests', () => {
  let server: Server;
  let app: express.Express;
  const port = 5001; // Используем другой порт для тестов

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Регистрируем только API маршруты (без фронтенд-фолбэка)
    const httpServer = await registerRoutes(app);
    
    // Добавляем тот же перехват что и в основном приложении
    app.use("/api/*", (req, res) => {
      res.status(404).json({ 
        error: "API route not found",
        path: req.path,
        method: req.method
      });
    });
    
    server = httpServer;
    await new Promise<void>((resolve) => {
      server.listen(port, resolve);
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should return JSON 404 for nonexistent API routes', async () => {
    const response = await fetch(`http://localhost:${port}/api/nonexistent-endpoint`);
    
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toEqual({
      error: "API route not found",
      path: "/api/nonexistent-endpoint",
      method: "GET"
    });
  });

  it('should return JSON 404 for POST requests to nonexistent API routes', async () => {
    const response = await fetch(`http://localhost:${port}/api/invalid-post-endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toEqual({
      error: "API route not found",
      path: "/api/invalid-post-endpoint", 
      method: "POST"
    });
  });

  it('should return JSON 404 for PUT requests to nonexistent API routes', async () => {
    const response = await fetch(`http://localhost:${port}/api/invalid-put-endpoint`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toEqual({
      error: "API route not found",
      path: "/api/invalid-put-endpoint",
      method: "PUT"
    });
  });

  it('should return JSON 404 for DELETE requests to nonexistent API routes', async () => {
    const response = await fetch(`http://localhost:${port}/api/invalid-delete-endpoint`, {
      method: 'DELETE'
    });
    
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toEqual({
      error: "API route not found",
      path: "/api/invalid-delete-endpoint",
      method: "DELETE"
    });
  });

  it('should work correctly for existing API routes', async () => {
    const response = await fetch(`http://localhost:${port}/api/metrics`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toHaveProperty('overview');
    expect(body).toHaveProperty('timestamp');
  });

  it('should work correctly for existing API routes with parameters', async () => {
    const response = await fetch(`http://localhost:${port}/api/changelog`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('should NOT return HTML for API routes', async () => {
    const response = await fetch(`http://localhost:${port}/api/completely-invalid-route`);
    
    expect(response.status).toBe(404);
    
    const body = await response.text();
    expect(body).not.toContain('<!DOCTYPE html>');
    expect(body).not.toContain('<html>');
    expect(body).not.toContain('<body>');
    
    // Должен быть валидный JSON
    expect(() => JSON.parse(body)).not.toThrow();
  });

  it('should handle different Accept headers correctly', async () => {
    const response = await fetch(`http://localhost:${port}/api/test-accept-header`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body.error).toBe("API route not found");
  });

  it('should handle API routes with query parameters correctly', async () => {
    const response = await fetch(`http://localhost:${port}/api/nonexistent?param1=value1&param2=value2`);
    
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const body = await response.json();
    expect(body).toEqual({
      error: "API route not found",
      path: "/api/nonexistent?param1=value1&param2=value2",
      method: "GET"
    });
  });
});