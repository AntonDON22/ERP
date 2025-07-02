import { Router } from "express";
import { WarehouseService } from "../services/warehouseService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";

const router = Router();
const warehouseService = new WarehouseService();

// Валидация для удаления складов
const deleteWarehousesSchema = z.object({
  warehouseIds: z.array(z.number()).min(1, "Укажите хотя бы один склад для удаления"),
});

// GET /api/warehouses
router.get("/", async (req, res) => {
  try {
    const warehouses = await warehouseService.getAll();
    res.json(warehouses);
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID склада" });
    }

    const warehouse = await warehouseService.getById(id);
    if (!warehouse) {
      return res.status(404).json({ error: "Склад не найден" });
    }

    res.json(warehouse);
  } catch (error) {
    apiLogger.error("Failed to get warehouse", {
      warehouseId: req.params.id,
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID склада" });
    }

    const warehouse = await warehouseService.update(id, req.body);
    if (!warehouse) {
      return res.status(404).json({ error: "Склад не найден" });
    }

    res.json(warehouse);
  } catch (error) {
    apiLogger.error("Failed to update warehouse", {
      warehouseId: req.params.id,
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка обновления склада" });
  }
});

// DELETE /api/warehouses/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID склада" });
    }

    const success = await warehouseService.delete(id);
    if (!success) {
      return res.status(404).json({ error: "Склад не найден" });
    }

    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete warehouse", {
      warehouseId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления склада" });
  }
});

// POST /api/warehouses/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteWarehousesSchema.parse(req.body);
    const results = await warehouseService.deleteMultiple(validatedData.warehouseIds);
    res.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }

    apiLogger.error("Failed to delete multiple warehouses", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления складов" });
  }
});

export default router;
