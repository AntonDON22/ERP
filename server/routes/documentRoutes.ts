import { Router } from "express";
import { DocumentService } from "../services/documentService";
import { cacheService } from "../services/cacheService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";
import { insertDocumentSchema, receiptDocumentSchema } from "../../shared/schema";
import type { CreateDocumentItem } from "../../shared/schema";
import { storage } from "../storage";

const router = Router();
const documentService = new DocumentService();

// Валидация схем
const createDocumentSchema = z.object({
  type: z.string().refine((val) => {
    return val === "income" || val === "outcome" || val === "return";
  }, "Тип документа должен быть 'income', 'outcome' или 'return'"),
  status: z.enum(["draft", "posted"], { required_error: "Статус документа обязателен" }),
  name: z.string().optional().default(""),
  warehouseId: z.number().min(1, "Выберите склад"),
  items: z
    .array(
      z.object({
        productId: z.number().min(1, "Выберите товар"),
        quantity: z.union([
          z.string().min(1, "Количество обязательно"),
          z.number().min(0, "Количество не может быть отрицательным"),
        ]),
        price: z.union([z.string(), z.number()]).optional(),
      })
    )
    .min(1, "Добавьте хотя бы один товар"),
});
const updateDocumentSchema = z.object({
  document: insertDocumentSchema.partial(),
  items: z
    .array(
      z.object({
        productId: z.number().min(1, "Выберите товар"),
        quantity: z.union([
          z.string().min(1, "Количество обязательно"),
          z.number().min(0, "Количество не может быть отрицательным"),
        ]),
      })
    )
    .optional(),
});
const deleteDocumentsSchema = z.object({
  documentIds: z.array(z.number()).min(1, "Укажите хотя бы один документ для удаления"),
});
const getDocumentSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val), "ID должен быть числом"),
});

// GET /api/documents
router.get("/", async (req, res) => {
  try {
    const documents = await documentService.getAll();
    res.json(documents);
  } catch (error) {
    apiLogger.error("Failed to get documents", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения документов" });
  }
});

// GET /api/documents/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = getDocumentSchema.parse(req.params);

    const document = await documentService.getById(id);
    if (!document) {
      return res.status(404).json({ error: "Документ не найден" });
    }

    res.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to get document", {
      documentId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения документа" });
  }
});

// POST /api/documents/create
router.post("/create", async (req, res) => {
  try {
    const validatedData = receiptDocumentSchema.parse(req.body);

    // Используем проверенные данные из receiptDocumentSchema
    const documentData = {
      type: validatedData.type,
      status: validatedData.status,
      name: validatedData.name || "",
      warehouseId: validatedData.warehouseId,
    };

    // Преобразуем данные для storage (все поля должны быть числами для внутренней логики)
    const processedItems: any[] = validatedData.items.map((item) => ({
      productId: item.productId,
      quantity: typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity,
      price: item.price
        ? typeof item.price === "string"
          ? parseFloat(item.price)
          : item.price
        : undefined,
    }));

    const document = await storage.createReceiptDocument(documentData, processedItems);
    res.status(201).json(document);

    // Инвалидируем кеш остатков после создания документа
    await cacheService.invalidatePattern("inventory:*");
    apiLogger.info("Inventory cache invalidated after receipt document creation", {
      documentId: document.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to create receipt document", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка создания документа" });
  }
});

// PUT /api/documents/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = getDocumentSchema.parse(req.params);
    const validatedData = updateDocumentSchema.parse(req.body);
    


    const document = await documentService.update(
      id,
      validatedData.document,
      validatedData.items
    );
    if (!document) {
      return res.status(404).json({ error: "Документ не найден" });
    }

    // Инвалидируем кеш остатков после обновления документа
    await cacheService.invalidatePattern("inventory:*");
    apiLogger.info("Inventory cache invalidated after document update", { documentId: id });

    res.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error('💥 Route error details:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    apiLogger.error("Failed to update document", {
      documentId: req.params.id,
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка обновления документа" });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = getDocumentSchema.parse(req.params);

    const success = await documentService.deleteById(id);
    if (!success) {
      return res.status(404).json({ error: "Документ не найден" });
    }

    // Инвалидируем весь кеш остатков после удаления документа
    await cacheService.invalidatePattern("inventory:*");
    apiLogger.info("Inventory cache invalidated after document deletion", { documentId: id });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete document", {
      documentId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления документа" });
  }
});

// POST /api/documents/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteDocumentsSchema.parse(req.body);
    const result = await documentService.deleteMultiple(validatedData.documentIds);

    // Инвалидируем весь кеш остатков после множественного удаления
    await cacheService.invalidatePattern("inventory:*");
    apiLogger.info("Inventory cache invalidated after multiple document deletion", {
      deletedCount: result.deletedCount,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete multiple documents", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления документов" });
  }
});

export default router;
