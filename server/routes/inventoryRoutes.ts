import { Router } from "express";
import { InventoryService } from "../services/inventoryService";
import { inventoryCache } from "../middleware/cacheMiddleware";
import { apiLogger } from "../../shared/logger";

const router = Router();
const inventoryService = new InventoryService();

// GET /api/inventory
router.get("/", inventoryCache, async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
    
    const inventory = await inventoryService.getInventory(warehouseId);
    
    // Валидация API ответа для гарантии согласованности
    try {
      const { validateApiResponse } = await import('@shared/apiNormalizer');
      validateApiResponse(inventory);
    } catch (validationError) {
      apiLogger.error("API validation failed for inventory", { error: validationError instanceof Error ? validationError.message : String(validationError) });
    }
    
    res.json(inventory);
  } catch (error) {
    apiLogger.error("Failed to get inventory", { warehouseId: req.query.warehouseId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения остатков" });
  }
});

// GET /api/inventory/availability
router.get("/availability", inventoryCache, async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
    
    // Используем обычный сервис - кеширование происходит через middleware
    const availability = await inventoryService.getInventoryAvailability(warehouseId);
    
    // Валидация API ответа для гарантии согласованности
    try {
      const { validateApiResponse } = await import('@shared/apiNormalizer');
      validateApiResponse(availability);
    } catch (validationError) {
      apiLogger.error("API validation failed for inventory availability", { error: validationError instanceof Error ? validationError.message : String(validationError) });
    }
    
    res.json(availability);
  } catch (error) {
    apiLogger.error("Failed to get inventory availability", { warehouseId: req.query.warehouseId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения доступности" });
  }
});

export default router;