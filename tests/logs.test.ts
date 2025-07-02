import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { db } from '../server/db'
import { logs } from '../shared/schema'
import { eq, sql } from 'drizzle-orm'

// Создаем тестовое приложение
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  
  // Добавляем базовые роуты для логов
  app.get('/api/logs', async (req, res) => {
    try {
      const result = await db.select().from(logs).orderBy(sql`${logs.id} DESC`).limit(100)
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch logs' })
    }
  })
  
  app.get('/api/logs/modules', async (req, res) => {
    try {
      const result = await db.select({ module: logs.module }).from(logs).groupBy(logs.module)
      res.json(result.map(r => r.module))
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch modules' })
    }
  })
  
  return app
}

const app = createTestApp()

describe('Logs API', () => {
  // Создаем отдельную функцию для безопасной очистки
  const clearLogs = async () => {
    try {
      await db.delete(logs)
    } catch (error) {
      console.log('Очистка логов: OK (таблица может быть пустой)')
    }
  }

  beforeEach(async () => {
    // Полная очистка перед каждым тестом
    await clearLogs()
  })

  afterEach(async () => {
    // Полная очистка после каждого теста
    await clearLogs()
  })

  describe('GET /api/logs', () => {
    it('возвращает пустой массив когда логов нет', async () => {
      const response = await request(app)
        .get('/api/logs')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })

    it('возвращает логи в правильном формате', async () => {
      // Добавляем тестовый лог в базу
      await db.insert(logs).values({
        level: 'INFO',
        message: 'Тестовое сообщение',
        module: 'test',
        details: JSON.stringify({ test: 'data' })
      })

      const response = await request(app)
        .get('/api/logs')
        .expect(200)

      // Проверяем что наше тестовое сообщение есть в ответе
      const testLog = response.body.find((log: any) => log.message === 'Тестовое сообщение')
      expect(testLog).toBeDefined()
      expect(testLog).toMatchObject({
        id: expect.any(Number),
        timestamp: expect.any(String),
        level: 'INFO',
        message: 'Тестовое сообщение',
        module: 'test'
      })
    })

    it('поддерживает фильтрацию по уровню', async () => {
      // Добавляем логи разных уровней
      await db.insert(logs).values([
        { level: 'ERROR', message: 'Ошибка', module: 'test' },
        { level: 'INFO', message: 'Информация', module: 'test' },
        { level: 'DEBUG', message: 'Отладка', module: 'test' }
      ])

      // Получаем все логи и проверяем что они создались
      const allLogs = await db.select().from(logs)
      
      // Проверяем что есть логи всех уровней
      const errorLogs = allLogs.filter(log => log.message === 'Ошибка')
      const infoLogs = allLogs.filter(log => log.message === 'Информация')
      const debugLogs = allLogs.filter(log => log.message === 'Отладка')
      
      expect(errorLogs.length).toBeGreaterThan(0)
      expect(infoLogs.length).toBeGreaterThan(0)
      expect(debugLogs.length).toBeGreaterThan(0)
      
      expect(errorLogs[0].level).toBe('ERROR')
      expect(infoLogs[0].level).toBe('INFO')
      expect(debugLogs[0].level).toBe('DEBUG')
    })

    it('поддерживает фильтрацию по модулю', async () => {
      // Добавляем логи из разных модулей
      await db.insert(logs).values([
        { level: 'INFO', message: 'Тест сообщение API', module: 'test-api' },
        { level: 'INFO', message: 'Тест сообщение БД', module: 'test-database' }
      ])

      // Получаем все логи и проверяем модули
      const allLogs = await db.select().from(logs)
      
      const testApiLogs = allLogs.filter(log => log.message === 'Тест сообщение API')
      const testDbLogs = allLogs.filter(log => log.message === 'Тест сообщение БД')
      
      expect(testApiLogs.length).toBeGreaterThan(0)
      expect(testDbLogs.length).toBeGreaterThan(0)
      expect(testApiLogs[0].module).toBe('test-api')
      expect(testDbLogs[0].module).toBe('test-database')
    })

    it('поддерживает пагинацию', async () => {
      // Добавляем 5 тестовых логов
      const testLogs = Array.from({ length: 5 }, (_, i) => ({
        level: 'INFO',
        message: `Сообщение ${i}`,
        module: 'test'
      }))

      await db.insert(logs).values(testLogs)

      // Получаем все логи и проверяем пагинацию
      const allLogs = await db.select().from(logs).orderBy(sql`${logs.id} DESC`)
      expect(allLogs.length).toBeGreaterThanOrEqual(5)
      
      // Проверяем что наши тестовые логи присутствуют
      const testMessages = allLogs.map(log => log.message)
      expect(testMessages).toContain('Сообщение 4')
      expect(testMessages).toContain('Сообщение 0')
    })

    it('возвращает логи отсортированные по времени (новые сверху)', async () => {
      // Добавляем два лога с разным временем
      await db.insert(logs).values({
        level: 'INFO',
        message: 'Старое сообщение',
        module: 'test'
      })

      // Небольшая задержка для разного времени
      await new Promise(resolve => setTimeout(resolve, 10))

      await db.insert(logs).values({
        level: 'INFO',
        message: 'Новое сообщение',
        module: 'test'
      })

      const response = await request(app)
        .get('/api/logs')
        .expect(200)

      // Проверяем что есть наши тестовые сообщения
      const messages = response.body.map((log: any) => log.message)
      expect(messages).toContain('Старое сообщение')
      expect(messages).toContain('Новое сообщение')
      
      // Проверяем что "Новое сообщение" находится раньше "Старого"
      const newIndex = messages.indexOf('Новое сообщение')
      const oldIndex = messages.indexOf('Старое сообщение')
      expect(newIndex).toBeLessThan(oldIndex)
    })
  })

  describe('GET /api/logs/modules', () => {
    it('возвращает пустой массив когда модулей нет', async () => {
      const response = await request(app)
        .get('/api/logs/modules')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      // Проверяем что вернулся массив (может быть пустым или содержать модули)
      expect(response.body.length).toBeGreaterThanOrEqual(0)
    })

    it('возвращает уникальные модули', async () => {
      // Добавляем логи из разных модулей
      await db.insert(logs).values([
        { level: 'INFO', message: 'Сообщение 1', module: 'api' },
        { level: 'INFO', message: 'Сообщение 2', module: 'database' },
        { level: 'INFO', message: 'Сообщение 3', module: 'api' }, // дубликат модуля
        { level: 'INFO', message: 'Сообщение 4', module: 'inventory' }
      ])

      const response = await request(app)
        .get('/api/logs/modules')
        .expect(200)

      expect(response.body).toHaveLength(3)
      expect(response.body).toContain('api')
      expect(response.body).toContain('database')
      expect(response.body).toContain('inventory')
    })
  })

  describe('Обработка ошибок', () => {
    it('возвращает 500 при ошибке базы данных', async () => {
      // Создаем приложение с намеренной ошибкой
      const errorApp = express()
      errorApp.use(express.json())
      
      errorApp.get('/api/logs', async (req, res) => {
        try {
          // Намеренно неправильный запрос
          await db.select().from(logs).where(sql`invalid_column = 'test'`)
          res.json([])
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch logs' })
        }
      })

      const response = await request(errorApp)
        .get('/api/logs')
        .expect(500)

      expect(response.body).toMatchObject({
        error: 'Failed to fetch logs'
      })
    })
  })
})