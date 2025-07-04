import { Router } from "express";
import { ShipmentService } from "../services/shipmentService";
import { getErrorMessage } from "@shared/utils";
import { logger } from "@shared/logger";
import { mediumCache } from "../middleware/cacheMiddleware";

const router = Router();

// Получить все отгрузки (с кешированием)
router.get("/", mediumCache, async (req, res) => {
  try {
    const shipments = await ShipmentService.getAll();
    res.json(shipments);
  } catch (error) {
    logger.error("Error retrieving shipments: " + getErrorMessage(error));
    res.status(500).json({ error: "Не удалось получить отгрузки" });
  }
});

// Получить отгрузку по ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const shipment = await ShipmentService.getById(id);
    
    if (!shipment) {
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }
    
    res.json(shipment);
  } catch (error) {
    logger.error("Error retrieving shipment: " + getErrorMessage(error));
    res.status(500).json({ error: "Не удалось получить отгрузку" });
  }
});

// Создать отгрузку
router.post("/", async (req, res) => {
  try {
    const shipment = await ShipmentService.create(req.body);
    res.status(201).json(shipment);
  } catch (error) {
    logger.error("Error creating shipment: " + getErrorMessage(error));
    res.status(500).json({ error: "Не удалось создать отгрузку" });
  }
});

// Обновить отгрузку
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const shipment = await ShipmentService.update(id, req.body);
    
    if (!shipment) {
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }
    
    res.json(shipment);
  } catch (error) {
    logger.error("Error updating shipment: " + getErrorMessage(error));
    res.status(500).json({ error: "Не удалось обновить отгрузку" });
  }
});

// Удалить отгрузку
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await ShipmentService.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }
    
    res.json({ message: "Отгрузка удалена" });
  } catch (error) {
    logger.error("Error deleting shipment: " + getErrorMessage(error));
    res.status(500).json({ error: "Не удалось удалить отгрузку" });
  }
});

// Множественное удаление отгрузок
router.post("/delete-multiple", async (req, res) => {
  try {
    const { ids } = req.body;
    const count = await ShipmentService.deleteMultiple(ids);
    res.json({ message: `Удалено отгрузок: ${count}` });
  } catch (error) {
    logger.error("Error deleting multiple shipments: " + getErrorMessage(error));
    res.status(500).json({ error: "Не удалось удалить отгрузки" });
  }
});

export { router as shipmentRoutes };