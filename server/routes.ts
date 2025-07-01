import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { insertProductSchema, importProductSchema, insertSupplierSchema, insertContractorSchema, insertWarehouseSchema, insertDocumentSchema, receiptDocumentSchema, orderSchema, documents, documentItems, inventory, orders, orderItems, insertOrderSchema, reserves } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

// Импорт сервисов
import { productService } from "./services/productService";
import { supplierService } from "./services/supplierService";
import { contractorService } from "./services/contractorService";
import { documentService } from "./services/documentService";
import { inventoryService } from "./services/inventoryService";
import { orderService } from "./services/orderService";
import { transactionService } from "./services/transactionService";
import { materializedViewService } from "./services/materializedViewService";

// Импорт логирования
import { apiLogger, getErrorMessage } from "@shared/logger";

// Импорт middleware валидации
import { 
  validateBody, 
  validateParams, 
  idParamSchema, 
  productIdsSchema, 
  supplierIdsSchema, 
  contractorIdsSchema,
  documentIdsSchema,
  orderIdsSchema,
  warehouseIdsSchema
} from "./middleware/validation";

// Функция для очистки числовых значений от валютных символов и единиц измерения
function cleanNumericValue(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  const str = String(value).trim();
  if (!str) return null;
  
  // Удаляем валютные символы (₽, $, €, руб.), единицы измерения (г, кг, мм, см, м) и лишние пробелы
  let cleanedStr = str
    .replace(/₽/g, '') // символ рубля
    .replace(/[$€]/g, '') // доллар и евро
    .replace(/\s*руб\.?/gi, '') // "руб" или "руб."
    .replace(/\s*г\b/gi, '') // граммы
    .replace(/\s*кг\b/gi, '') // килограммы
    .replace(/\s*мм\b/gi, '') // миллиметры
    .replace(/\s*см\b/gi, '') // сантиметры
    .replace(/\s*м\b/gi, '') // метры
    .replace(/[^\d.,\-]/g, '') // оставляем только цифры, точки, запятые и минус
    .replace(/,/g, '.') // заменяем запятые на точки
    .trim();
  
  if (!cleanedStr) return null;
  
  // Проверяем что получилось валидное число
  const num = parseFloat(cleanedStr);
  return isNaN(num) ? null : cleanedStr;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await productService.getAll();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Ошибка при загрузке товаров" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID товара" });
      }

      const success = await productService.delete(id);
      if (!success) {
        return res.status(404).json({ message: "Товар не найден" });
      }

      res.json({ message: "Товар успешно удален" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Ошибка при удалении товара" });
    }
  });

  // Delete multiple products
  app.post("/api/products/delete-multiple", validateBody(productIdsSchema), async (req, res) => {
    try {
      const { productIds } = req.body;
      const result = await productService.deleteMultiple(productIds);
      
      res.json({ 
        message: `Удалено товаров: ${result.deletedCount} из ${productIds.length}`,
        deletedCount: result.deletedCount,
        results: result.results 
      });
    } catch (error) {
      console.error("Error deleting multiple products:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Ошибка при удалении товаров" });
    }
  });

  // Bulk import products
  app.post("/api/products/import", async (req, res) => {
    try {
      const { products } = req.body;
      const results = await productService.import(products);
      res.json(results);
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Ошибка при импорте товаров" });
    }
  });

  // Suppliers API routes
  // Get all suppliers
  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await supplierService.getAll();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Ошибка при загрузке поставщиков" });
    }
  });

  // Delete multiple suppliers
  app.post("/api/suppliers/delete-multiple", validateBody(supplierIdsSchema), async (req, res) => {
    try {
      const { supplierIds } = req.body;
      const result = await supplierService.deleteMultiple(supplierIds);
      
      res.json({ 
        message: `Удалено поставщиков: ${result.deletedCount} из ${supplierIds.length}`,
        deletedCount: result.deletedCount,
        results: result.results
      });
    } catch (error) {
      console.error("Error deleting multiple suppliers:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Ошибка при удалении поставщиков" });
    }
  });

  // Bulk import suppliers
  app.post("/api/suppliers/import", async (req, res) => {
    try {
      const { suppliers } = req.body;
      const results = await supplierService.import(suppliers);
      res.json(results);
    } catch (error) {
      console.error("Error importing suppliers:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Ошибка при импорте поставщиков" });
    }
  });

  // Get all contractors
  app.get("/api/contractors", async (req, res) => {
    try {
      const contractors = await contractorService.getAll();
      res.json(contractors);
    } catch (error) {
      console.error("Error fetching contractors:", error);
      res.status(500).json({ message: "Ошибка при загрузке контрагентов" });
    }
  });

  // Delete contractor
  app.delete("/api/contractors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID контрагента" });
      }

      const success = await contractorService.delete(id);
      if (success) {
        res.json({ message: "Контрагент удален" });
      } else {
        res.status(404).json({ message: "Контрагент не найден" });
      }
    } catch (error) {
      console.error("Error deleting contractor:", error);
      res.status(500).json({ message: "Ошибка при удалении контрагента" });
    }
  });

  // Delete multiple contractors
  app.post("/api/contractors/delete-multiple", validateBody(contractorIdsSchema), async (req, res) => {
    try {
      const { contractorIds } = req.body;
      const result = await contractorService.deleteMultiple(contractorIds);
      
      res.json({ 
        message: `Удалено контрагентов: ${result.deletedCount} из ${contractorIds.length}`,
        deletedCount: result.deletedCount,
        results: result.results
      });
    } catch (error) {
      console.error("Error deleting multiple contractors:", error);
      res.status(500).json({ message: "Ошибка при удалении контрагентов" });
    }
  });

  // Bulk import contractors
  app.post("/api/contractors/import", async (req, res) => {
    try {
      const { contractors } = req.body;

      if (!Array.isArray(contractors)) {
        return res.status(400).json({ message: "Ожидается массив контрагентов" });
      }

      const results = [];
      for (const contractorData of contractors) {
        try {
          const validatedData = {
            name: contractorData.name || contractorData.Название || "Без названия",
            website: String(contractorData.website || contractorData.Вебсайт || ""),
          };
          
          // Проверяем наличие ID для обновления
          const id = contractorData.ID || contractorData.id;
          let contractor;
          
          if (id && Number.isInteger(Number(id))) {
            const numericId = Number(id);
            // Обновляем существующего контрагента
            contractor = await contractorService.update(numericId, validatedData);
            if (!contractor) {
              // Если контрагент с таким ID не найден, создаем нового
              contractor = await contractorService.create(validatedData);
            }
          } else {
            // Создаем нового контрагента
            contractor = await contractorService.create(validatedData);
          }
          
          results.push(contractor);
        } catch (error) {
          console.error('Error importing contractor:', contractorData, error);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing contractors:", error);
      res.status(500).json({ message: "Ошибка при импорте контрагентов" });
    }
  });

  // Warehouses routes
  // Get all warehouses
  app.get("/api/warehouses", async (req, res) => {
    try {
      const warehouses = await storage.getWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ message: "Ошибка при получении складов" });
    }
  });

  // Create warehouse
  app.post("/api/warehouses", validateBody(insertWarehouseSchema), async (req, res) => {
    try {
      const warehouse = await storage.createWarehouse(req.body);
      res.status(201).json(warehouse);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(400).json({ message: "Ошибка при создании склада" });
    }
  });

  // Delete multiple warehouses
  app.delete("/api/warehouses", validateBody(warehouseIdsSchema), async (req, res) => {
    try {
      const { warehouseIds } = req.body;
      
      if (!Array.isArray(warehouseIds)) {
        return res.status(400).json({ message: "Ожидается массив ID складов" });
      }

      const results = [];
      let deletedCount = 0;

      for (const id of warehouseIds) {
        try {
          const success = await storage.deleteWarehouse(id);
          if (success) {
            deletedCount++;
            results.push({ id, status: 'deleted' });
          } else {
            results.push({ id, status: 'not_found' });
          }
        } catch (error) {
          console.error(`Error deleting warehouse ${id}:`, error);
          results.push({ id, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({ 
        message: `Удалено складов: ${deletedCount} из ${warehouseIds.length}`,
        deletedCount,
        results 
      });
    } catch (error) {
      console.error("Error deleting multiple warehouses:", error);
      res.status(500).json({ message: "Ошибка при удалении складов" });
    }
  });

  // Bulk import warehouses
  app.post("/api/warehouses/import", async (req, res) => {
    try {
      const { warehouses } = req.body;

      if (!Array.isArray(warehouses)) {
        return res.status(400).json({ message: "Ожидается массив складов" });
      }

      const results = [];
      for (const warehouseData of warehouses) {
        try {
          const validatedData = {
            name: warehouseData.name || warehouseData.Название || "Без названия",
            address: String(warehouseData.address || warehouseData.Адрес || ""),
          };
          
          // Проверяем наличие ID для обновления
          const id = warehouseData.ID || warehouseData.id;
          let warehouse;
          
          if (id && Number.isInteger(Number(id))) {
            const numericId = Number(id);
            // Обновляем существующий склад
            warehouse = await storage.updateWarehouse(numericId, validatedData);
            if (!warehouse) {
              // Если склад с таким ID не найден, создаем новый
              warehouse = await storage.createWarehouse(validatedData);
            }
          } else {
            // Создаем новый склад
            warehouse = await storage.createWarehouse(validatedData);
          }
          
          results.push(warehouse);
        } catch (error) {
          console.error('Error importing warehouse:', warehouseData, error);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing warehouses:", error);
      res.status(500).json({ message: "Ошибка при импорте складов" });
    }
  });

  // Documents routes
  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Ошибка при загрузке документов" });
    }
  });

  // Get single document by ID
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID документа" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Документ не найден" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Ошибка при загрузке документа" });
    }
  });

  // Update document
  app.put("/api/documents/:id", validateParams(idParamSchema), validateBody(receiptDocumentSchema), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID документа" });
      }

      const { warehouseId, items, type } = req.body;
      
      console.log(`🔄 Обновление документа ${id}:`, { warehouseId, items, type });

      // Обновляем документ (склад и тип)
      const [updatedDocument] = await db
        .update(documents)
        .set({ warehouseId, type })
        .where(eq(documents.id, id))
        .returning();

      // Генерируем новое название в формате "Тип + день.месяц + номер в дне"
      const today = new Date().toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit' 
      });
      
      // Получаем количество документов данного типа за сегодня
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayDocuments = await db
        .select()
        .from(documents)
        .where(sql`${documents.type} = ${type} AND ${documents.createdAt} >= ${todayStart.toISOString()} AND ${documents.createdAt} <= ${todayEnd.toISOString()}`);
      
      const dayNumber = todayDocuments.length;
      const newName = `${type} ${today}-${dayNumber}`;
      
      // Обновляем название
      await db
        .update(documents)
        .set({ name: newName })
        .where(eq(documents.id, id));

      if (!updatedDocument) {
        return res.status(404).json({ message: "Документ не найден" });
      }

      // Удаляем старые записи из inventory и document_items
      await db.delete(inventory).where(eq(inventory.documentId, id));
      await db.delete(documentItems).where(eq(documentItems.documentId, id));

      // Создаем новые записи document_items
      const documentItemsData = items.map((item: any) => ({
        documentId: id,
        productId: item.productId,
        quantity: item.quantity.toString(),
        price: item.price.toString()
      }));

      await db.insert(documentItems).values(documentItemsData);

      // Создаем новые записи inventory в зависимости от типа
      if (type === 'Оприходование') {
        // Для оприходования - просто добавляем положительные записи
        const inventoryData = items.map((item: any) => ({
          documentId: id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          movementType: 'IN'
        }));
        await db.insert(inventory).values(inventoryData);
      } else if (type === 'Списание') {
        // Для списания - добавляем отрицательные записи (FIFO будет обрабатывать позже)
        const inventoryData = items.map((item: any) => ({
          documentId: id,
          productId: item.productId,
          quantity: -Math.abs(item.quantity), // Отрицательное количество для списания
          price: item.price,
          movementType: 'OUT'
        }));
        await db.insert(inventory).values(inventoryData);
      }

      console.log(`✅ Документ ${id} обновлен`);
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Ошибка при обновлении документа" });
    }
  });

  // Delete multiple documents
  app.post("/api/documents/delete-multiple", validateBody(documentIdsSchema), async (req, res) => {
    try {
      const { documentIds } = req.body;
      const result = await documentService.deleteMultiple(documentIds);
      
      res.json({ 
        message: `Удалено документов: ${result.deletedCount} из ${documentIds.length}`,
        deletedCount: result.deletedCount,
        results: result.results
      });
    } catch (error) {
      console.error("Error deleting multiple documents:", error);
      res.status(500).json({ message: "Ошибка при удалении документов" });
    }
  });

  // Create receipt document
  app.post("/api/documents/create-receipt", validateBody(receiptDocumentSchema), async (req, res) => {
    try {
      console.log("🔄 Создание документа:", req.body);
      
      // Создаем простую валидацию для нового формата данных
      const { type, warehouseId, items } = req.body;
      
      if (!type || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          message: "Требуется указать тип документа и минимум один товар"
        });
      }
      
      // Валидируем элементы
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.price) {
          return res.status(400).json({ 
            message: "Каждый товар должен содержать productId, quantity и price"
          });
        }
      }
      
      // Создаем данные документа без name и date
      const documentData = {
        type: type,
        warehouseId: warehouseId,
        name: "", // Будет заполнено автоматически в storage
        date: new Date().toISOString().split('T')[0], // Текущая дата
      };
      
      // Преобразуем элементы в правильный формат
      const itemsData = items.map((item: any) => ({
        productId: Number(item.productId),
        quantity: item.quantity.toString(),
        price: item.price.toString(),
      }));
      
      console.log("📋 Данные документа:", documentData);
      console.log("📦 Данные товаров:", itemsData);
      
      // Создаем только один документ с элементами
      const document = await storage.createReceiptDocument(documentData, itemsData);
      console.log("✅ Документ создан:", document);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating receipt document:", error);
      res.status(500).json({ message: "Ошибка при создании документа" });
    }
  });

  // Get inventory (products with their current stock levels)
  app.get("/api/inventory", async (req, res) => {
    try {
      const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
      const inventory = await storage.getInventory(warehouseId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Ошибка при загрузке остатков" });
    }
  });

  // Get inventory with availability (considering reserves)
  app.get("/api/inventory/availability", async (req, res) => {
    try {
      console.log("[DB] Starting inventory availability query...");
      const startTime = Date.now();
      
      const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
      
      // Получаем остатки на складе
      const inventoryData = await storage.getInventory(warehouseId);
      
      // Получаем резервы по складу
      const reservesQuery = warehouseId 
        ? db.select({
            productId: reserves.productId,
            reservedQuantity: sql<string>`SUM(CAST(${reserves.quantity} AS DECIMAL))`.as('reserved_quantity')
          })
          .from(reserves)
          .where(eq(reserves.warehouseId, warehouseId))
          .groupBy(reserves.productId)
        : db.select({
            productId: reserves.productId,
            reservedQuantity: sql<string>`SUM(CAST(${reserves.quantity} AS DECIMAL))`.as('reserved_quantity')
          })
          .from(reserves)
          .groupBy(reserves.productId);
      
      const reservesData = await reservesQuery;
      
      // Создаем карту резервов для быстрого поиска
      const reservesMap = new Map();
      reservesData.forEach(reserve => {
        reservesMap.set(reserve.productId, parseFloat(reserve.reservedQuantity) || 0);
      });
      
      // Объединяем данные
      const availabilityData = inventoryData.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        reserved: reservesMap.get(item.id) || 0,
        available: item.quantity - (reservesMap.get(item.id) || 0) // Убрал Math.max(0, ...) чтобы показывать отрицательные значения
      }));
      
      const duration = Date.now() - startTime;
      console.log(`[DB] Inventory availability completed in ${duration}ms, returned ${availabilityData.length} items`);
      
      res.json(availabilityData);
    } catch (error) {
      console.error("Error fetching inventory availability:", error);
      res.status(500).json({ message: "Ошибка при загрузке доступных остатков" });
    }
  });

  // Orders routes
  // Get all orders
  app.get("/api/orders", async (req, res) => {
    try {
      const ordersData = await db.select().from(orders);
      res.json(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Ошибка при загрузке заказов" });
    }
  });

  // Get single order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID заказа" });
      }

      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      if (!order) {
        return res.status(404).json({ message: "Заказ не найден" });
      }

      // Получаем элементы заказа
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      res.json({
        ...order,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: Number(item.quantity),
          price: Number(item.price)
        }))
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Ошибка при загрузке заказа" });
    }
  });

  // Create order
  app.post("/api/orders/create", validateBody(orderSchema), async (req, res) => {
    try {
      const { status, customerId, warehouseId, isReserved, items } = req.body;
      
      console.log(`🔄 Создание заказа:`, { status, customerId, warehouseId, items });

      // Создаем заказ в транзакции
      const order = await db.transaction(async (tx) => {
        // 1. Создаем заказ
        const [createdOrder] = await tx
          .insert(orders)
          .values({
            name: "", // временное название
            status,
            customerId: customerId || null,
            warehouseId,
            isReserved: isReserved || false,
            date: new Date().toISOString().split('T')[0],
            totalAmount: "0",
          })
          .returning();

        // 2. Генерируем название в формате "Заказ день.месяц-номер"
        const today = new Date().toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        const todayOrders = await tx
          .select()
          .from(orders)
          .where(sql`${orders.createdAt} >= ${todayStart.toISOString()} AND ${orders.createdAt} <= ${todayEnd.toISOString()}`);
        
        const dayNumber = todayOrders.length;
        const name = `Заказ ${today}-${dayNumber}`;

        // 3. Создаем позиции заказа и считаем общую сумму
        let totalAmount = 0;
        for (const item of items) {
          await tx
            .insert(orderItems)
            .values({
              orderId: createdOrder.id,
              productId: item.productId,
              quantity: item.quantity.toString(),
              price: item.price.toString()
            });
          totalAmount += item.quantity * item.price;
        }

        // 4. Создаем резервы если флаг isReserved = true
        if (isReserved) {
          for (const item of items) {
            await tx
              .insert(reserves)
              .values({
                orderId: createdOrder.id,
                productId: item.productId,
                quantity: item.quantity.toString(),
                warehouseId
              });
          }
          console.log(`📦 Созданы резервы для заказа ${createdOrder.id}`);
        }

        // 5. Обновляем заказ с названием и общей суммой
        const [updatedOrder] = await tx
          .update(orders)
          .set({ 
            name,
            totalAmount: totalAmount.toFixed(2)
          })
          .where(eq(orders.id, createdOrder.id))
          .returning();

        return updatedOrder;
      });

      console.log(`✅ Заказ создан:`, order);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Ошибка при создании заказа" });
    }
  });

  // Delete multiple orders
  app.post("/api/orders/delete-multiple", validateBody(orderIdsSchema), async (req, res) => {
    try {
      const { orderIds } = req.body;
      const result = await orderService.deleteMultiple(orderIds);
      
      res.json({ 
        message: `Удалено заказов: ${result.deletedCount} из ${orderIds.length}`,
        deletedCount: result.deletedCount,
        results: result.results
      });
    } catch (error) {
      console.error("Error deleting orders:", error);
      res.status(500).json({ message: "Ошибка при удалении заказов" });
    }
  });

  // Update order
  app.put("/api/orders/:id", validateParams(idParamSchema), validateBody(orderSchema), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID заказа" });
      }

      const { status, customerId, warehouseId, isReserved, items } = req.body;
      
      console.log(`🔄 Обновление заказа ${id}:`, { status, customerId, warehouseId, isReserved, items });

      // Обновляем заказ в транзакции
      const updatedOrder = await db.transaction(async (tx) => {
        // Считаем новую общую сумму
        let totalAmount = 0;
        for (const item of items) {
          totalAmount += item.quantity * item.price;
        }

        // Обновляем основную информацию заказа
        const [order] = await tx
          .update(orders)
          .set({ 
            status,
            customerId: customerId || null,
            warehouseId,
            isReserved: isReserved || false,
            totalAmount: totalAmount.toFixed(2)
          })
          .where(eq(orders.id, id))
          .returning();

        // Удаляем старые позиции
        await tx.delete(orderItems).where(eq(orderItems.orderId, id));

        // Удаляем старые резервы
        await tx.delete(reserves).where(eq(reserves.orderId, id));

        // Создаем новые позиции
        for (const item of items) {
          await tx
            .insert(orderItems)
            .values({
              orderId: id,
              productId: item.productId,
              quantity: item.quantity.toString(),
              price: item.price.toString()
            });
        }

        // Создаем резервы если флаг isReserved = true
        if (isReserved) {
          for (const item of items) {
            await tx
              .insert(reserves)
              .values({
                orderId: id,
                productId: item.productId,
                quantity: item.quantity.toString(),
                warehouseId
              });
          }
          console.log(`📦 Обновлены резервы для заказа ${id}`);
        }

        return order;
      });

      console.log(`✅ Заказ ${id} обновлен`);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Ошибка при обновлении заказа" });
    }
  });

  // Materialized Views API routes
  // Initialize materialized views
  app.post("/api/admin/materialized-views/init", async (req, res) => {
    try {
      await materializedViewService.initializeMaterializedViews();
      res.json({ message: "Материализованные представления инициализированы" });
    } catch (error) {
      console.error("Error initializing materialized views:", error);
      res.status(500).json({ message: "Ошибка при инициализации представлений" });
    }
  });

  // Refresh all materialized views
  app.post("/api/admin/materialized-views/refresh", async (req, res) => {
    try {
      await materializedViewService.refreshAllViews();
      res.json({ message: "Все материализованные представления обновлены" });
    } catch (error) {
      console.error("Error refreshing materialized views:", error);
      res.status(500).json({ message: "Ошибка при обновлении представлений" });
    }
  });

  // Get materialized views status
  app.get("/api/admin/materialized-views/status", async (req, res) => {
    try {
      const stats = await inventoryService.getPerformanceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting materialized views status:", error);
      res.status(500).json({ message: "Ошибка при получении статуса представлений" });
    }
  });

  // Toggle materialized views usage
  app.post("/api/admin/materialized-views/toggle", async (req, res) => {
    try {
      const { enabled } = req.body;
      inventoryService.setUseMaterializedViews(enabled);
      res.json({ 
        message: `Материализованные представления ${enabled ? 'включены' : 'выключены'}`,
        enabled 
      });
    } catch (error) {
      console.error("Error toggling materialized views:", error);
      res.status(500).json({ message: "Ошибка при переключении представлений" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
