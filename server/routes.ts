import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { insertProductSchema, insertSupplierSchema, insertContractorSchema } from "@shared/schema";

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
      const { products } = req.body;
      if (!Array.isArray(products)) {
        return res.status(400).json({ message: "Ожидается массив товаров" });
      }

      const results = [];
      for (const productData of products) {
        try {
          const validatedData = insertProductSchema.parse(productData);
          const product = await storage.createProduct(validatedData);
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
          results.push({ id, status: 'error', error: error.message });
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
          results.push({ id, status: 'error', error: error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}