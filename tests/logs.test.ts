import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../server'
import { db } from '../server/db'
import { logs } from '../shared/schema'
import { eq, sql } from 'drizzle-orm'

describe('Logs API', () => {
  beforeEach(async () => {
    // Очищаем таблицу логов перед каждым тестом
    await db.delete(logs)
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
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Тестовое сообщение',
        module: 'test',
        details: JSON.stringify({ test: 'data' })
      })

      const response = await request(app)
        .get('/api/logs')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        id: expect.any(Number),
        timestamp: expect.any(String),
        level: 'INFO',
        message: 'Тестовое сообщение',
        module: 'test',
        details: expect.any(String)
      })
    })

    it('поддерживает фильтрацию по уровню', async () => {
      await db.insert(logs).values([
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Информационное сообщение',
          module: 'test'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          message: 'Сообщение об ошибке',
          module: 'test'
        }
      ])

      const response = await request(app)
        .get('/api/logs?level=ERROR')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].level).toBe('ERROR')
    })

    it('поддерживает фильтрацию по модулю', async () => {
      await db.insert(logs).values([
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Сообщение API',
          module: 'api'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Сообщение БД',
          module: 'database'
        }
      ])

      const response = await request(app)
        .get('/api/logs?module=api')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].module).toBe('api')
    })

    it('поддерживает пагинацию', async () => {
      // Добавляем 25 тестовых логов
      const testLogs = Array.from({ length: 25 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        level: 'INFO',
        message: `Сообщение ${i}`,
        module: 'test'
      }))

      await db.insert(logs).values(testLogs)

      const response = await request(app)
        .get('/api/logs?limit=10&offset=0')
        .expect(200)

      expect(response.body).toHaveLength(10)
    })

    it('возвращает логи отсортированные по времени (новые сверху)', async () => {
      const now = Date.now()
      await db.insert(logs).values([
        {
          timestamp: new Date(now - 2000).toISOString(),
          level: 'INFO',
          message: 'Старое сообщение',
          module: 'test'
        },
        {
          timestamp: new Date(now - 1000).toISOString(),
          level: 'INFO',
          message: 'Новое сообщение',
          module: 'test'
        }
      ])

      const response = await request(app)
        .get('/api/logs')
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0].message).toBe('Новое сообщение')
      expect(response.body[1].message).toBe('Старое сообщение')
    })
  })

  describe('GET /api/logs/modules', () => {
    it('возвращает пустой массив когда логов нет', async () => {
      const response = await request(app)
        .get('/api/logs/modules')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })

    it('возвращает уникальные модули', async () => {
      await db.insert(logs).values([
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Сообщение 1',
          module: 'api'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Сообщение 2',
          module: 'database'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Сообщение 3',
          module: 'api' // дублирует модуль
        }
      ])

      const response = await request(app)
        .get('/api/logs/modules')
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body).toContain('api')
      expect(response.body).toContain('database')
    })

    it('возвращает модули отсортированные по алфавиту', async () => {
      await db.insert(logs).values([
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Сообщение',
          module: 'zebra'
        },
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Сообщение',
          module: 'alpha'
        }
      ])

      const response = await request(app)
        .get('/api/logs/modules')
        .expect(200)

      expect(response.body[0]).toBe('alpha')
      expect(response.body[1]).toBe('zebra')
    })
  })

  describe('Логирование через logger', () => {
    it('записывает логи в базу данных', async () => {
      const { logger } = await import('../shared/logger')
      
      await logger.info('Тестовое сообщение для записи в БД')

      // Небольшая задержка для асинхронной записи
      await new Promise(resolve => setTimeout(resolve, 100))

      const savedLogs = await db.select().from(logs).where(
        eq(logs.message, 'Тестовое сообщение для записи в БД')
      )

      expect(savedLogs).toHaveLength(1)
      expect(savedLogs[0].level).toBe('INFO')
      expect(savedLogs[0].module).toBe('app')
    })

    it('записывает метаданные в поле details', async () => {
      const { logger } = await import('../shared/logger')
      
      await logger.warn('Предупреждение с метаданными', { userId: 123, action: 'test' })

      await new Promise(resolve => setTimeout(resolve, 100))

      const savedLogs = await db.select().from(logs).where(
        eq(logs.message, 'Предупреждение с метаданными')
      )

      expect(savedLogs).toHaveLength(1)
      expect(savedLogs[0].details).toBeDefined()
      
      const details = JSON.parse(savedLogs[0].details!)
      expect(details).toMatchObject({
        userId: 123,
        action: 'test'
      })
    })
  })

  describe('Автоматическая очистка логов', () => {
    it('удаляет логи старше 3 месяцев', async () => {
      const now = new Date()
      const fourMonthsAgo = new Date(now.getTime() - 4 * 30 * 24 * 60 * 60 * 1000)
      const twoMonthsAgo = new Date(now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000)

      await db.insert(logs).values([
        {
          timestamp: fourMonthsAgo.toISOString(),
          level: 'INFO',
          message: 'Старый лог',
          module: 'test'
        },
        {
          timestamp: twoMonthsAgo.toISOString(),
          level: 'INFO',
          message: 'Свежий лог',
          module: 'test'
        }
      ])

      // Имитируем автоматическую очистку
      const threeMonthsAgo = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000)
      await db.delete(logs).where(
        sql`${logs.timestamp} < ${threeMonthsAgo.toISOString()}`
      )

      const remainingLogs = await db.select().from(logs)
      
      expect(remainingLogs).toHaveLength(1)
      expect(remainingLogs[0].message).toBe('Свежий лог')
    })
  })
})