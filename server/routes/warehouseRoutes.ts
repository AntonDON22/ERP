import { Router } from "express";
import { warehouseService } from "../services/warehouseService";
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

// GET /api/warehouses с поддержкой пагинации
router.get("/", async (req, res) => {
  try {
    const hasPageParam = req.query.page !== undefined;
    
    if (hasPageParam) {
      const params = paginationService.parseParams(req.query);
      const normalizedParams = paginationService.normalizeParams(params);
      const warehouses = await warehouseService.getAllPaginated(normalizedParams);
      const total = await warehouseService.getCount();
      const result = paginationService.createResult(warehouses, total, normalizedParams);
      
      paginationService.logUsage("/api/warehouses", normalizedParams, total);
      res.json(result);
    } else {
      const warehouses = await warehouseService.getAll();
      res.json(warehouses);
    }
  } catch (error) {
    apiLogger.error("Failed to get warehouses", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения складов" });
  }
});

// GET /api/warehouses/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const warehouse = await warehouseService.getById(parseInt(id));
    
    if (!warehouse) {
      return res.status(404).json({ error: "Склад не найден" });
    }
    
    res.json(warehouse);
  } catch (error) {
    apiLogger.error("Failed to get warehouse", {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения склада" });
  }
});

// POST /api/warehouses
router.post("/", async (req, res) => {
  try {
    const warehouse = await warehouseService.create(req.body);
    res.status(201).json(warehouse);
  } catch (error) {
    apiLogger.error("Failed to create warehouse", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка создания склада" });
  }
});

// PUT /api/warehouses/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const warehouse = await warehouseService.update(parseInt(id), req.body);
    
    if (!warehouse) {
      return res.status(404).json({ error: "Склад не найден" });
    }
    
    res.json(warehouse);
  } catch (error) {
    apiLogger.error("Failed to update warehouse", {
      id: req.params.id,
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка обновления склада" });
  }
});

// DELETE /api/warehouses/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const success = await warehouseService.delete(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ error: "Склад не найден" });
    }
    
    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete warehouse", {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления склада" });
  }
});

// POST /api/warehouses/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const count = await warehouseService.deleteMultiple(req.body.ids);
    res.json({ success: true, count });
  } catch (error) {
    apiLogger.error("Failed to delete multiple warehouses", {
      ids: req.body.ids,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления складов" });
  }
});

export { router as warehouseRoutes };