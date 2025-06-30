import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { insertProductSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + "-" + Math.round(Math.random() * 1E9);
      cb(null, name + ext);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

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

  // Get single product
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID товара" });
      }

      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Товар не найден" });
      }

      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Ошибка при загрузке товара" });
    }
  });

  // Create product
  app.post("/api/products", upload.single('image'), async (req, res) => {
    try {
      // Parse form data
      const productData = {
        ...req.body,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined
      };

      // Validate data
      const validatedData = insertProductSchema.parse(productData);

      // Check if SKU already exists
      const existingProduct = await storage.getProductBySku(validatedData.sku);
      if (existingProduct) {
        return res.status(400).json({ message: "Товар с таким артикулом уже существует" });
      }

      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      if (error.errors) {
        return res.status(400).json({ 
          message: "Ошибка валидации данных",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Ошибка при создании товара" });
    }
  });

  // Update product
  app.put("/api/products/:id", upload.single('image'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID товара" });
      }

      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Товар не найден" });
      }

      // Parse form data
      const productData = {
        ...req.body,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined
      };

      // Remove undefined values to preserve existing data
      Object.keys(productData).forEach(key => {
        if (productData[key] === undefined) {
          delete productData[key];
        }
      });

      // If SKU is being changed, check for conflicts
      if (productData.sku && productData.sku !== existingProduct.sku) {
        const conflictingProduct = await storage.getProductBySku(productData.sku);
        if (conflictingProduct && conflictingProduct.id !== id) {
          return res.status(400).json({ message: "Товар с таким артикулом уже существует" });
        }
      }

      // Validate data
      const validatedData = insertProductSchema.partial().parse(productData);

      const updatedProduct = await storage.updateProduct(id, validatedData);
      if (!updatedProduct) {
        return res.status(404).json({ message: "Товар не найден" });
      }

      res.json(updatedProduct);
    } catch (error: any) {
      console.error("Error updating product:", error);
      if (error.errors) {
        return res.status(400).json({ 
          message: "Ошибка валидации данных",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Ошибка при обновлении товара" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Некорректный ID товара" });
      }

      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Товар не найден" });
      }

      // Delete associated image file if it exists
      if (product.imageUrl && product.imageUrl.startsWith('/uploads/')) {
        const imagePath = path.join(uploadDir, path.basename(product.imageUrl));
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      const deleted = await storage.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ message: "Товар не найден" });
      }

      res.json({ message: "Товар успешно удален" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Ошибка при удалении товара" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
