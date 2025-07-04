import express from "express";
import { ShipmentService } from "../services/shipmentService";
import { validateBody, validateParams, idParamSchema, shipmentIdsSchema } from "../middleware/validation";
import { createInsertSchema } from "drizzle-zod";
import { shipments, createShipmentSchema } from "../../shared/schema";
import { logger } from "../../shared/logger";
import { cacheService } from "../services/cacheService";

const insertShipmentSchema = createInsertSchema(shipments);
const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

const router = express.Router();

/**
 * GET /api/shipments - Получить все отгрузки
 */
router.get("/", async (req, res) => {
  try {
    logger.info("GET /shipments", {
      method: req.method,
      url: req.originalUrl,
      bodySize: JSON.stringify(req.body).length,
    });

    const shipments = await ShipmentService.getAll();
    
    logger.info("Retrieved all shipments", { 
      count: shipments.length, 
      entity: "Shipment" 
    });
    
    res.json(shipments);
  } catch (error) {
    logger.error("Error in GET /shipments", { error: getErrorMessage(error) });
    res.status(500).json({ 
      error: "Ошибка сервера при получении отгрузок", 
      success: false 
    });
  }
});

/**
 * GET /api/shipments/:id - Получить отгрузку по ID
 */
router.get("/:id", validateParams(idParamSchema), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const shipment = await ShipmentService.getById(id);

    if (!shipment) {
      return res.status(404).json({ 
        error: "Отгрузка не найдена", 
        success: false 
      });
    }

    res.json(shipment);
  } catch (error) {
    logger.error("Error in GET /shipments/:id", { 
      error: getErrorMessage(error), 
      id: req.params.id 
    });
    res.status(500).json({ 
      error: "Ошибка сервера при получении отгрузки", 
      success: false 
    });
  }
});

/**
 * POST /api/shipments - Создать новую отгрузку
 */
router.post("/", validateBody(createShipmentSchema), async (req, res) => {
  try {
    const shipment = await ShipmentService.create(req.body);
    
    // Инвалидируем кеш отгрузок
    await cacheService.invalidatePattern("shipments:*");
    
    logger.info("Shipment created", { 
      shipmentId: shipment.id,
      orderId: shipment.orderId 
    });
    
    res.status(201).json(shipment);
  } catch (error) {
    logger.error("Error in POST /shipments", { 
      error: getErrorMessage(error), 
      body: req.body 
    });
    res.status(500).json({ 
      error: "Ошибка сервера при создании отгрузки", 
      success: false 
    });
  }
});

/**
 * PUT /api/shipments/:id - Обновить отгрузку
 */
router.put("/:id", validateParams(idParamSchema), validateBody(insertShipmentSchema.partial()), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedShipment = await ShipmentService.update(id, req.body);

    if (!updatedShipment) {
      return res.status(404).json({ 
        error: "Отгрузка не найдена", 
        success: false 
      });
    }

    // Инвалидируем кеш отгрузок
    await cacheService.invalidatePattern("shipments:*");

    logger.info("Shipment updated", { 
      shipmentId: id,
      updatedFields: Object.keys(req.body) 
    });

    res.json(updatedShipment);
  } catch (error) {
    logger.error("Error in PUT /shipments/:id", { 
      error: getErrorMessage(error), 
      id: req.params.id,
      body: req.body 
    });
    res.status(500).json({ 
      error: "Ошибка сервера при обновлении отгрузки", 
      success: false 
    });
  }
});

/**
 * DELETE /api/shipments/:id - Удалить отгрузку
 */
router.delete("/:id", validateParams(idParamSchema), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await ShipmentService.delete(id);

    if (!deleted) {
      return res.status(404).json({ 
        error: "Отгрузка не найдена", 
        success: false 
      });
    }

    // Инвалидируем кеш отгрузок
    await cacheService.invalidatePattern("shipments:*");

    logger.info("Shipment deleted", { shipmentId: id });

    res.json({ success: true, message: "Отгрузка успешно удалена" });
  } catch (error) {
    logger.error("Error in DELETE /shipments/:id", { 
      error: getErrorMessage(error), 
      id: req.params.id 
    });
    res.status(500).json({ 
      error: "Ошибка сервера при удалении отгрузки", 
      success: false 
    });
  }
});

/**
 * POST /api/shipments/delete-multiple - Множественное удаление отгрузок
 */
router.post("/delete-multiple", validateBody(shipmentIdsSchema), async (req, res) => {
  try {
    const { shipmentIds } = req.body;
    const deletedCount = await ShipmentService.deleteMultiple(shipmentIds);

    // Инвалидируем кеш отгрузок
    await cacheService.invalidatePattern("shipments:*");

    logger.info("Multiple shipments deleted", { 
      requestedCount: shipmentIds.length,
      deletedCount 
    });

    res.json({ 
      success: true, 
      message: `Удалено ${deletedCount} отгрузок из ${shipmentIds.length} запрошенных`,
      deletedCount 
    });
  } catch (error) {
    logger.error("Error in POST /shipments/delete-multiple", { 
      error: getErrorMessage(error), 
      body: req.body 
    });
    res.status(500).json({ 
      error: "Ошибка сервера при множественном удалении отгрузок", 
      success: false 
    });
  }
});

export default router;