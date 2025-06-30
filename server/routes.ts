import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { insertProductSchema, importProductSchema, insertSupplierSchema, insertContractorSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}