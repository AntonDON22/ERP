import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { insertProductSchema, insertSupplierSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get system updates
  app.get("/api/system-updates", async (req, res) => {
    try {
      const updates = await storage.getSystemUpdates();
      res.json(updates);
    } catch (error) {
      console.error("Error fetching system updates:", error);
      res.status(500).json({ error: "Failed to fetch system updates" });
    }
  });

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

  // API маршруты для поставщиков
  
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

  // Create supplier
  app.post("/api/suppliers", async (req, res) => {
    try {
      const validatedData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(validatedData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Ошибка при создании поставщика" });
    }
  });

  // Update supplier
  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID поставщика" });
      }

      const validatedData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(id, validatedData);
      
      if (!supplier) {
        return res.status(404).json({ message: "Поставщик не найден" });
      }

      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Ошибка при обновлении поставщика" });
    }
  });

  // Delete supplier
  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID поставщика" });
      }

      const success = await storage.deleteSupplier(id);
      if (!success) {
        return res.status(404).json({ message: "Поставщик не найден" });
      }

      res.json({ message: "Поставщик успешно удален" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Ошибка при удалении поставщика" });
    }
  });

  // Bulk delete suppliers
  app.post("/api/suppliers/delete-multiple", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "Ожидается массив ID поставщиков" });
      }

      let deletedCount = 0;
      for (const id of ids) {
        const success = await storage.deleteSupplier(id);
        if (success) deletedCount++;
      }

      res.json({ message: `Удалено поставщиков: ${deletedCount}` });
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
          const validatedData = insertSupplierSchema.parse(supplierData);
          const supplier = await storage.createSupplier(validatedData);
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

  const httpServer = createServer(app);
  return httpServer;
}