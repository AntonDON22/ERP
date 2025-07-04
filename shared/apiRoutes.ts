/**
 * 🔒 АРХИТЕКТУРНАЯ ЗАЩИТА: Централизованные API маршруты
 *
 * КРИТИЧЕСКОЕ ПРАВИЛО: Все обращения к API должны использовать только эти константы.
 * Запрещено использование прямых строк типа "/api/products" в коде.
 *
 * При добавлении нового маршрута:
 * 1. Добавить его сюда
 * 2. Обновить replit.md секцию "API Endpoints"
 * 3. Создать соответствующий тест
 */

// Базовые CRUD операции
export const API_ROUTES = {
  // Товары
  PRODUCTS: {
    LIST: "/api/products" as const,
    GET: (id: number) => `/api/products/${id}` as const,
    CREATE: "/api/products" as const,
    UPDATE: (id: number) => `/api/products/${id}` as const,
    DELETE: (id: number) => `/api/products/${id}` as const,
    DELETE_MULTIPLE: "/api/products/delete-multiple" as const,
  },

  // Поставщики
  SUPPLIERS: {
    LIST: "/api/suppliers" as const,
    GET: (id: number) => `/api/suppliers/${id}` as const,
    CREATE: "/api/suppliers" as const,
    UPDATE: (id: number) => `/api/suppliers/${id}` as const,
    DELETE: (id: number) => `/api/suppliers/${id}` as const,
    DELETE_MULTIPLE: "/api/suppliers/delete-multiple" as const,
    IMPORT: "/api/suppliers/import" as const,
  },

  // Контрагенты
  CONTRACTORS: {
    LIST: "/api/contractors" as const,
    GET: (id: number) => `/api/contractors/${id}` as const,
    CREATE: "/api/contractors" as const,
    UPDATE: (id: number) => `/api/contractors/${id}` as const,
    DELETE: (id: number) => `/api/contractors/${id}` as const,
    DELETE_MULTIPLE: "/api/contractors/delete-multiple" as const,
    IMPORT: "/api/contractors/import" as const,
  },

  // Склады
  WAREHOUSES: {
    LIST: "/api/warehouses" as const,
    GET: (id: number) => `/api/warehouses/${id}` as const,
    CREATE: "/api/warehouses" as const,
    UPDATE: (id: number) => `/api/warehouses/${id}` as const,
    DELETE: (id: number) => `/api/warehouses/${id}` as const,
    DELETE_MULTIPLE: "/api/warehouses/delete-multiple" as const,
    IMPORT: "/api/warehouses/import" as const,
  },

  // Документы (ВНИМАНИЕ: Только /create для создания!)
  DOCUMENTS: {
    LIST: "/api/documents" as const,
    GET: (id: number) => `/api/documents/${id}` as const,
    CREATE: "/api/documents/create" as const, // КРИТИЧНО: Только этот endpoint!
    UPDATE: (id: number) => `/api/documents/${id}` as const,
    DELETE: (id: number) => `/api/documents/${id}` as const,
    DELETE_MULTIPLE: "/api/documents/delete-multiple" as const,
  },

  // Заказы (ВНИМАНИЕ: Только /create для создания!)
  ORDERS: {
    LIST: "/api/orders" as const,
    GET: (id: number) => `/api/orders/${id}` as const,
    CREATE: "/api/orders/create" as const, // КРИТИЧНО: Только этот endpoint!
    UPDATE: (id: number) => `/api/orders/${id}` as const,
    DELETE: (id: number) => `/api/orders/${id}` as const,
    DELETE_MULTIPLE: "/api/orders/delete-multiple" as const,
    
    // Отгрузки по заказам
    SHIPMENTS: {
      LIST: (orderId: number) => `/api/orders/${orderId}/shipments` as const,
      CREATE: (orderId: number) => `/api/orders/${orderId}/shipments` as const,
      GET: (orderId: number, shipmentId: number) => `/api/orders/${orderId}/shipments/${shipmentId}` as const,
      UPDATE: (orderId: number, shipmentId: number) => `/api/orders/${orderId}/shipments/${shipmentId}` as const,
      DELETE: (orderId: number, shipmentId: number) => `/api/orders/${orderId}/shipments/${shipmentId}` as const,
    },
  },

  // Отгрузки (независимые от заказов)
  SHIPMENTS: {
    LIST: "/api/shipments" as const,
    CREATE: "/api/shipments" as const,
    GET: (id: number) => `/api/shipments/${id}` as const,
    UPDATE: (id: number) => `/api/shipments/${id}` as const,
    DELETE: (id: number) => `/api/shipments/${id}` as const,
    DELETE_MULTIPLE: "/api/shipments/delete-multiple" as const,
  },

  // Остатки
  INVENTORY: {
    LIST: "/api/inventory" as const,
    AVAILABILITY: "/api/inventory/availability" as const,
  },

  // Системные маршруты
  SYSTEM: {
    LOGS: {
      LIST: "/api/logs" as const,
      MODULES: "/api/logs/modules" as const,
      CLEAR: "/api/logs" as const, // DELETE method
    },
    METRICS: "/api/metrics" as const,
    CHANGELOG: "/api/changelog" as const,
    CLIENT_ERRORS: "/api/client-errors" as const,
    CACHE: {
      WARMUP: "/api/cache/warmup" as const,
      STATUS: "/api/cache/status" as const,
    },
  },
} as const;

// Типы для TypeScript
export type ApiRoute = typeof API_ROUTES;
export type ProductRoutes = typeof API_ROUTES.PRODUCTS;
export type SupplierRoutes = typeof API_ROUTES.SUPPLIERS;
export type ContractorRoutes = typeof API_ROUTES.CONTRACTORS;
export type WarehouseRoutes = typeof API_ROUTES.WAREHOUSES;
export type DocumentRoutes = typeof API_ROUTES.DOCUMENTS;
export type OrderRoutes = typeof API_ROUTES.ORDERS;
export type InventoryRoutes = typeof API_ROUTES.INVENTORY;
export type SystemRoutes = typeof API_ROUTES.SYSTEM;

/**
 * Валидация корректности использования маршрутов
 * Используется в тестах для проверки архитектурной согласованности
 */
export function validateApiRoute(route: string): boolean {
  const allRoutes = getAllApiRoutes();
  return allRoutes.includes(route);
}

/**
 * Получить все доступные API маршруты для валидации
 */
export function getAllApiRoutes(): string[] {
  const routes: string[] = [];

  // Базовые маршруты без параметров
  Object.values(API_ROUTES).forEach((section) => {
    if (typeof section === "string") {
      routes.push(section);
    } else {
      Object.values(section).forEach((route) => {
        if (typeof route === "string") {
          routes.push(route);
        }
      });
    }
  });

  return routes;
}

/**
 * АРХИТЕКТУРНЫЕ ПРАВИЛА:
 *
 * ❌ НЕ ДЕЛАТЬ:
 * - useQuery({ queryKey: ["/api/products"] })
 * - fetch("/api/documents/receipt")
 * - apiRequest("/api/orders")
 *
 * ✅ ПРАВИЛЬНО:
 * - useQuery({ queryKey: [API_ROUTES.PRODUCTS.LIST] })
 * - fetch(API_ROUTES.DOCUMENTS.CREATE)
 * - apiRequest(API_ROUTES.ORDERS.CREATE)
 */
