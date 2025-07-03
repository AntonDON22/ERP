import { Router } from "express";
import { supplierService } from "../services/supplierService";
import { paginationService } from "../services/paginationService";
import { z } from "zod";
import { logger } from "../../shared/logger";

const router = Router();
const apiLogger = logger;

const idParamSchema = z.object({
  id: z.string()
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val), "ID должен быть числом"),
});

// GET /api/suppliers с поддержкой пагинации
router.get("/", async (req, res) => {
  try {
    const hasPageParam = req.query.page !== undefined;
    
    if (hasPageParam) {
      const params = paginationService.parseParams(req.query);
      const normalizedParams = paginationService.normalizeParams(params);
      const suppliers = await supplierService.getAllPaginated(normalizedParams);
      const total = await supplierService.getCount();
      const result = paginationService.createResult(suppliers, total, normalizedParams);
      
      paginationService.logUsage("/api/suppliers", normalizedParams, total);
      res.json(result);
    } else {
      const suppliers = await supplierService.getAll();
      res.json(suppliers);
    }
  } catch (error) {
    apiLogger.error("Failed to get suppliers", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения поставщиков" });
  }
});

// GET /api/suppliers/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const supplier = await supplierService.getById(parseInt(id));
    
    if (!supplier) {
      return res.status(404).json({ error: "Поставщик не найден" });
    }
    
    res.json(supplier);
  } catch (error) {
    apiLogger.error("Failed to get supplier", {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения поставщика" });
  }
});

// POST /api/suppliers
router.post("/", async (req, res) => {
  try {
    const supplier = await supplierService.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    apiLogger.error("Failed to create supplier", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка создания поставщика" });
  }
});

// PUT /api/suppliers/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const supplier = await supplierService.update(parseInt(id), req.body);
    
    if (!supplier) {
      return res.status(404).json({ error: "Поставщик не найден" });
    }
    
    res.json(supplier);
  } catch (error) {
    apiLogger.error("Failed to update supplier", {
      id: req.params.id,
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка обновления поставщика" });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const success = await supplierService.delete(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ error: "Поставщик не найден" });
    }
    
    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete supplier", {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления поставщика" });
  }
});

// POST /api/suppliers/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const count = await supplierService.deleteMultiple(req.body.ids);
    res.json({ success: true, count });
  } catch (error) {
    apiLogger.error("Failed to delete multiple suppliers", {
      ids: req.body.ids,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления поставщиков" });
  }
});

export { router as supplierRoutes };