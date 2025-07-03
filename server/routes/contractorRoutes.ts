import { Router } from "express";
import { contractorService } from "../services/contractorService";
import { paginationService } from "../services/paginationService";
import { z } from "zod";
import { logger } from "../../shared/logger";
import { longCache } from "../middleware/cacheMiddleware";

const router = Router();
const apiLogger = logger;

const idParamSchema = z.object({
  id: z.string()
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val), "ID должен быть числом"),
});

// GET /api/contractors с поддержкой пагинации
router.get("/", longCache, async (req, res) => {
  try {
    const hasPageParam = req.query.page !== undefined;
    
    if (hasPageParam) {
      const params = paginationService.parseParams(req.query);
      const normalizedParams = paginationService.normalizeParams(params);
      const contractors = await contractorService.getAllPaginated(normalizedParams);
      const total = await contractorService.getCount();
      const result = paginationService.createResult(contractors, total, normalizedParams);
      
      paginationService.logUsage("/api/contractors", normalizedParams, total);
      res.json(result);
    } else {
      const contractors = await contractorService.getAll();
      res.json(contractors);
    }
  } catch (error) {
    apiLogger.error("Failed to get contractors", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения контрагентов" });
  }
});

// GET /api/contractors/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const contractor = await contractorService.getById(parseInt(id));
    
    if (!contractor) {
      return res.status(404).json({ error: "Контрагент не найден" });
    }
    
    res.json(contractor);
  } catch (error) {
    apiLogger.error("Failed to get contractor", {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения контрагента" });
  }
});

// POST /api/contractors
router.post("/", async (req, res) => {
  try {
    const contractor = await contractorService.create(req.body);
    res.status(201).json(contractor);
  } catch (error) {
    apiLogger.error("Failed to create contractor", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка создания контрагента" });
  }
});

// PUT /api/contractors/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const contractor = await contractorService.update(parseInt(id), req.body);
    
    if (!contractor) {
      return res.status(404).json({ error: "Контрагент не найден" });
    }
    
    res.json(contractor);
  } catch (error) {
    apiLogger.error("Failed to update contractor", {
      id: req.params.id,
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка обновления контрагента" });
  }
});

// DELETE /api/contractors/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const success = await contractorService.delete(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ error: "Контрагент не найден" });
    }
    
    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete contractor", {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления контрагента" });
  }
});

// POST /api/contractors/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const count = await contractorService.deleteMultiple(req.body.ids);
    res.json({ success: true, count });
  } catch (error) {
    apiLogger.error("Failed to delete multiple contractors", {
      ids: req.body.ids,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления контрагентов" });
  }
});

export { router as contractorRoutes };