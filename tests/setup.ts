import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Pool } from '@neondatabase/serverless';

// Глобальные переменные для тестов
declare global {
  var testPool: Pool;
}

beforeAll(async () => {
  // Инициализация тестовой базы данных
  if (process.env.DATABASE_URL) {
    global.testPool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });
  }
});

afterAll(async () => {
  // Очистка после всех тестов
  if (global.testPool) {
    await global.testPool.end();
  }
});

beforeEach(async () => {
  // Подготовка перед каждым тестом
  // Здесь можно добавить очистку данных
});

afterEach(async () => {
  // Очистка после каждого теста
  // Здесь можно добавить откат транзакций
});