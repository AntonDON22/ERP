/**
 * 🔧 Константы для унификации типов и значений в системе
 */

// Статусы документов
export const DOCUMENT_STATUS = {
  DRAFT: 'draft' as const,
  POSTED: 'posted' as const
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

// Типы документов
export const DOCUMENT_TYPE = {
  INCOME: 'income' as const,
  OUTCOME: 'outcome' as const,
  RETURN: 'return' as const
} as const;

export type DocumentType = typeof DOCUMENT_TYPE[keyof typeof DOCUMENT_TYPE];

// Статусы заказов
export const ORDER_STATUS = {
  NEW: 'Новый' as const,
  IN_PROGRESS: 'В работе' as const,
  COMPLETED: 'Выполнен' as const,
  CANCELLED: 'Отменен' as const
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// API endpoints
export const API_ENDPOINTS = {
  PRODUCTS: '/api/products',
  INVENTORY: '/api/inventory',
  DOCUMENTS: '/api/documents',
  ORDERS: '/api/orders',
  SUPPLIERS: '/api/suppliers',
  CONTRACTORS: '/api/contractors',
  WAREHOUSES: '/api/warehouses',
  LOGS: '/api/logs',
  METRICS: '/api/metrics',
  CHANGELOG: '/api/changelog'
} as const;

// Cache ключи
export const CACHE_KEYS = {
  PRODUCTS: 'products:all',
  INVENTORY: 'inventory:all',
  INVENTORY_AVAILABILITY: 'inventory:availability:all',
  DOCUMENTS: 'documents:all',
  ORDERS: 'orders:all',
  SUPPLIERS: 'suppliers:all',
  CONTRACTORS: 'contractors:all',
  WAREHOUSES: 'warehouses:all'
} as const;

// Размеры batch операций
export const BATCH_SIZES = {
  SMALL: 10,
  MEDIUM: 50,
  LARGE: 100,
  XLARGE: 500
} as const;

// Лимиты пагинации
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 1000,
  DEFAULT_OFFSET: 0
} as const;

// TTL для кеширования (в секундах)
export const CACHE_TTL = {
  SHORT: 60,      // 1 минута
  MEDIUM: 300,    // 5 минут  
  LONG: 3600,     // 1 час
  VERY_LONG: 86400 // 24 часа
} as const;

// Названия типов документов на русском
export const DOCUMENT_TYPE_NAMES = {
  [DOCUMENT_TYPE.INCOME]: 'Оприходование',
  [DOCUMENT_TYPE.OUTCOME]: 'Списание', 
  [DOCUMENT_TYPE.RETURN]: 'Возврат'
} as const;

// Валидация числовых полей
export const NUMERIC_LIMITS = {
  MIN_PRICE: 0,
  MAX_PRICE: 9999999.99,
  MIN_QUANTITY: 0,
  MAX_QUANTITY: 999999,
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 99999.99
} as const;