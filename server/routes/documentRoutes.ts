import { Router } from "express";
import { DocumentService } from "../services/documentService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";
import { insertDocumentSchema, receiptDocumentSchema } from "../../shared/schema";

const router = Router();
const documentService = new DocumentService();

// Валидация схем
const createDocumentSchema = receiptDocumentSchema;
const updateDocumentSchema = insertDocumentSchema.partial();
const deleteDocumentsSchema = z.object({
  documentIds: z.array(z.number()).min(1, "Укажите хотя бы один документ для удаления"),
});
const getDocumentSchema = z.object({
  id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val), "ID должен быть числом"),
});

// GET /api/documents
router.get("/", async (req, res) => {
  try {
    const documents = await documentService.getAll();
    res.json(documents);
  } catch (error) {
    apiLogger.error("Failed to get documents", { error: error instanceof Error ? error.message : String(error) });
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
    apiLogger.error("Failed to get document", { documentId: req.params.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения документа" });
  }
});

// POST /api/documents/create-receipt
router.post("/create-receipt", async (req, res) => {
  try {
    const validatedData = createDocumentSchema.parse(req.body);
    const document = await documentService.create(validatedData);
    res.status(201).json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to create receipt document", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка создания документа" });
  }
});

// PUT /api/documents/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = getDocumentSchema.parse(req.params);
    const validatedData = updateDocumentSchema.parse(req.body);
    
    const document = await documentService.update(id, validatedData);
    if (!document) {
      return res.status(404).json({ error: "Документ не найден" });
    }
    
    res.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to update document", { documentId: req.params.id, body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка обновления документа" });
  }
});

// POST /api/documents/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteDocumentsSchema.parse(req.body);
    const result = await documentService.deleteMultiple(validatedData.documentIds);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete multiple documents", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка удаления документов" });
  }
});

export default router;