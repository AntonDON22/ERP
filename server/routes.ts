import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { insertProductSchema } from "@shared/schema";

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

  // Bulk import products
  app.post("/api/products/import", async (req, res) => {
    try {
      const products = req.body;
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

  const httpServer = createServer(app);
  return httpServer;
}