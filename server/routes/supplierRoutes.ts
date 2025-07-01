import { Router } from "express";
import { SupplierService } from "../services/supplierService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";

const router = Router();
const supplierService = new SupplierService();

// Валидация для удаления поставщиков
const deleteSuppliersSchema = z.object({
  supplierIds: z.array(z.number()).min(1, "Укажите хотя бы одного поставщика для удаления"),
});

// GET /api/suppliers
router.get("/", async (req, res) => {
  try {
    const suppliers = await supplierService.getAll();
    res.json(suppliers);
  } catch (error) {
    apiLogger.error("Failed to get suppliers", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения поставщиков" });
  }
});

// GET /api/suppliers/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID поставщика" });
    }
    
    const supplier = await supplierService.getById(id);
    if (!supplier) {
      return res.status(404).json({ error: "Поставщик не найден" });
    }
    
    res.json(supplier);
  } catch (error) {
    apiLogger.error("Failed to get supplier", { supplierId: req.params.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения поставщика" });
  }
});

// POST /api/suppliers
router.post("/", async (req, res) => {
  try {
    const supplier = await supplierService.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    apiLogger.error("Failed to create supplier", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка создания поставщика" });
  }
});

// PUT /api/suppliers/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID поставщика" });
    }
    
    const supplier = await supplierService.update(id, req.body);
    if (!supplier) {
      return res.status(404).json({ error: "Поставщик не найден" });
    }
    
    res.json(supplier);
  } catch (error) {
    apiLogger.error("Failed to update supplier", { supplierId: req.params.id, body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка обновления поставщика" });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID поставщика" });
    }
    
    const deleted = await supplierService.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Поставщик не найден" });
    }
    
    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete supplier", { supplierId: req.params.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка удаления поставщика" });
  }
});

// POST /api/suppliers/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteSuppliersSchema.parse(req.body);
    const result = await supplierService.deleteMultiple(validatedData.supplierIds);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete multiple suppliers", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка удаления поставщиков" });
  }
});

// POST /api/suppliers/import
router.post("/import", async (req, res) => {
  try {
    const { suppliers } = req.body;
    if (!Array.isArray(suppliers)) {
      return res.status(400).json({ error: "Ожидается массив поставщиков" });
    }
    
    const result = await supplierService.import(suppliers);
    res.json(result);
  } catch (error) {
    apiLogger.error("Failed to import suppliers", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка импорта поставщиков" });
  }
});

export default router;