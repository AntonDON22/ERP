import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { insertProductSchema, importProductSchema, insertSupplierSchema, insertContractorSchema, insertWarehouseSchema, insertDocumentSchema, receiptDocumentSchema, documents, documentItems, inventory } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

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
      const products = await storage.getProducts();
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

      const success = await storage.deleteProduct(id);
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
  app.post("/api/products/delete-multiple", async (req, res) => {
    try {
      const { productIds } = req.body;
      
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Укажите массив ID товаров для удаления" });
      }

      // Проверяем, что все ID являются числами
      const validIds = productIds.filter(id => Number.isInteger(id) && id > 0);
      if (validIds.length !== productIds.length) {
        return res.status(400).json({ message: "Все ID товаров должны быть положительными числами" });
      }

      const results = [];
      let deletedCount = 0;
      
      for (const id of validIds) {
        try {
          const success = await storage.deleteProduct(id);
          if (success) {
            deletedCount++;
            results.push({ id, status: 'deleted' });
          } else {
            results.push({ id, status: 'not_found' });
          }
        } catch (error) {
          console.error(`Error deleting product ${id}:`, error);
          results.push({ id, status: 'error' });
        }
      }

      res.json({ 
        message: `Удалено товаров: ${deletedCount} из ${productIds.length}`,
        deletedCount,
        results 
      });
    } catch (error) {
      console.error("Error deleting multiple products:", error);
      res.status(500).json({ message: "Ошибка при удалении товаров" });
    }
  });

  // Bulk import products
  app.post("/api/products/import", async (req, res) => {
    try {
      // Данные приходят как объект с массивом products из фронтенда
      const products = req.body.products;
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ message: "Ожидается массив товаров" });
      }

      const results = [];
      for (const productData of products) {
        try {
          // Простая валидация для импорта с очисткой числовых значений
          const validatedData = {
            name: productData.name || productData.Название || "Без названия",
            sku: productData.sku || productData.Артикул || `SKU-${Date.now()}`,
            price: cleanNumericValue(productData.price || productData.Цена || "0") || "0",
            purchasePrice: cleanNumericValue(productData.purchasePrice || productData["Закупочная цена"]) || undefined,
            weight: cleanNumericValue(productData.weight || productData.Вес) || undefined,
            length: cleanNumericValue(productData.length || productData.Длина) || undefined,
            width: cleanNumericValue(productData.width || productData.Ширина) || undefined,
            height: cleanNumericValue(productData.height || productData.Высота) || undefined,
            barcode: String(productData.barcode || productData["Штрихкод"] || productData["Штрих-код"] || ""),
            imageUrl: String(productData.imageUrl || productData["Изображение"] || ""),
          };
          
          // Проверяем наличие ID для обновления
          const id = productData.ID || productData.id;
          let product;
          
          if (id && Number.isInteger(Number(id))) {
            const numericId = Number(id);
            // Обновляем существующий товар
            product = await storage.updateProduct(numericId, validatedData);
            if (!product) {
              // Если товар с таким ID не найден, создаем новый
              product = await storage.createProduct(validatedData);
            }
          } else {
            // Создаем новый товар
            product = await storage.createProduct(validatedData);
          }
          
          results.push(product);
        } catch (error) {
          console.error('Error importing product:', productData, error);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ message: "Ошибка при импорте товаров" });
    }
  });

  // Suppliers API routes
  // Get all suppliers
  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Ошибка при загрузке поставщиков" });
    }
  });

  // Delete multiple suppliers
  app.post("/api/suppliers/delete-multiple", async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Укажите массив ID поставщиков для удаления" });
      }

      const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
      if (validIds.length !== ids.length) {
        return res.status(400).json({ message: "Некорректные ID поставщиков" });
      }

      let deletedCount = 0;
      const results = [];

      for (const id of validIds) {
        try {
          const success = await storage.deleteSupplier(id);
          if (success) {
            deletedCount++;
            results.push({ id, status: 'deleted' });
          } else {
            results.push({ id, status: 'not_found' });
          }
        } catch (error) {
          console.error(`Error deleting supplier ${id}:`, error);
          results.push({ id, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({ 
        message: `Удалено поставщиков: ${deletedCount} из ${ids.length}`,
        deletedCount,
        results 
      });
    } catch (error) {
      console.error("Error deleting multiple suppliers:", error);
      res.status(500).json({ message: "Ошибка при удалении поставщиков" });
    }
  });

  // Bulk import suppliers
  app.post("/api/suppliers/import", async (req, res) => {
    try {
      const { suppliers } = req.body;

      if (!Array.isArray(suppliers)) {
        return res.status(400).json({ message: "Ожидается массив поставщиков" });
      }

      const results = [];
      for (const supplierData of suppliers) {
        try {
          const validatedData = {
            name: supplierData.name || supplierData.Название || "Без названия",
            website: String(supplierData.website || supplierData.Вебсайт || ""),
          };
          
          // Проверяем наличие ID для обновления
          const id = supplierData.ID || supplierData.id;
          let supplier;
          
          if (id && Number.isInteger(Number(id))) {
            const numericId = Number(id);
            // Обновляем существующего поставщика
            supplier = await storage.updateSupplier(numericId, validatedData);
            if (!supplier) {
              // Если поставщик с таким ID не найден, создаем нового
              supplier = await storage.createSupplier(validatedData);
            }
          } else {
            // Создаем нового поставщика
            supplier = await storage.createSupplier(validatedData);
          }
          
          results.push(supplier);
        } catch (error) {
          console.error('Error importing supplier:', supplierData, error);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing suppliers:", error);
      res.status(500).json({ message: "Ошибка при импорте поставщиков" });
    }
  });

  // Get all contractors
  app.get("/api/contractors", async (req, res) => {
    try {
      const contractors = await storage.getContractors();
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

      const success = await storage.deleteContractor(id);
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
  app.post("/api/contractors/delete-multiple", async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Укажите массив ID контрагентов для удаления" });
      }

      const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
      if (validIds.length !== ids.length) {
        return res.status(400).json({ message: "Некорректные ID контрагентов" });
      }

      let deletedCount = 0;
      const results = [];

      for (const id of validIds) {
        try {
          const success = await storage.deleteContractor(id);
          if (success) {
            deletedCount++;
            results.push({ id, status: 'deleted' });
          } else {
            results.push({ id, status: 'not_found' });
          }
        } catch (error) {
          console.error(`Error deleting contractor ${id}:`, error);
          results.push({ id, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({ 
        message: `Удалено контрагентов: ${deletedCount} из ${ids.length}`,
        deletedCount,
        results 
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
            contractor = await storage.updateContractor(numericId, validatedData);
            if (!contractor) {
              // Если контрагент с таким ID не найден, создаем нового
              contractor = await storage.createContractor(validatedData);
            }
          } else {
            // Создаем нового контрагента
            contractor = await storage.createContractor(validatedData);
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
  app.post("/api/warehouses", async (req, res) => {
    try {
      const validatedData = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(validatedData);
      res.status(201).json(warehouse);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(400).json({ message: "Ошибка при создании склада" });
    }
  });

  // Delete multiple warehouses
  app.delete("/api/warehouses", async (req, res) => {
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
  app.put("/api/documents/:id", async (req, res) => {
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
  app.post("/api/documents/delete-multiple", async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Укажите массив ID документов для удаления" });
      }

      const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
      if (validIds.length !== ids.length) {
        return res.status(400).json({ message: "Некорректные ID документов" });
      }

      let deletedCount = 0;
      const results = [];

      for (const id of validIds) {
        try {
          const success = await storage.deleteDocument(id);
          if (success) {
            deletedCount++;
            results.push({ id, status: 'deleted' });
          } else {
            results.push({ id, status: 'not_found' });
          }
        } catch (error) {
          console.error(`Error deleting document ${id}:`, error);
          results.push({ id, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({ 
        message: `Удалено документов: ${deletedCount} из ${ids.length}`,
        deletedCount,
        results 
      });
    } catch (error) {
      console.error("Error deleting multiple documents:", error);
      res.status(500).json({ message: "Ошибка при удалении документов" });
    }
  });

  // Create receipt document
  app.post("/api/documents/create-receipt", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}