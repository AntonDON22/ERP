import { Router } from "express";
import { ProductService } from "../services/productService";
import { paginationService } from "../services/paginationService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";
import { insertProductSchema } from "../../shared/schema";

const router = Router();
const productService = new ProductService();

// Валидация схем
const createProductSchema = insertProductSchema;
const updateProductSchema = insertProductSchema.partial();
const deleteProductsSchema = z.object({
  productIds: z.array(z.number()).min(1, "Укажите хотя бы один товар для удаления"),
});


const getProductSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val), "ID должен быть числом"),
});

// GET /api/products (временно без пагинации)
router.get("/", async (req, res) => {
  try {
    const products = await productService.getAll();
    res.json(products);
  } catch (error) {
    apiLogger.error("Failed to get products", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения товаров" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = getProductSchema.parse(req.params);

    const product = await productService.getById(id);
    if (!product) {
      return res.status(404).json({ error: "Товар не найден" });
    }

    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to get product", {
      productId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения товара" });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  try {
    const validatedData = createProductSchema.parse(req.body);
    const product = await productService.create(validatedData);
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to create product", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка создания товара" });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = getProductSchema.parse(req.params);
    const validatedData = updateProductSchema.parse(req.body);

    const product = await productService.update(id, validatedData);
    if (!product) {
      return res.status(404).json({ error: "Товар не найден" });
    }

    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to update product", {
      productId: req.params.id,
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка обновления товара" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID товара" });
    }

    const deleted = await productService.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Товар не найден" });
    }

    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete product", {
      productId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления товара" });
  }
});


// POST /api/products/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteProductsSchema.parse(req.body);
    const result = await productService.deleteMultiple(validatedData.productIds);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete multiple products", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления товаров" });
  }
});

// POST /api/products/import
router.post("/import", async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: "Ожидается массив товаров" });
    }

    const result = await productService.import(products);
    res.json(result);
  } catch (error) {
    apiLogger.error("Failed to import products", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка импорта товаров" });
  }
});

export default router;
