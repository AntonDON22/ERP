import { Router } from "express";
import { ShipmentService } from "../services/shipmentService";
import { createShipmentSchema } from "@shared/schema";
import { validateBody } from "../middleware/validation";
import { logger } from "@shared/logger";

const router = Router({ mergeParams: true }); // Включаем параметры из родительского роутера

/**
 * GET /api/orders/:orderId/shipments - Получить все отгрузки заказа
 */
router.get("/", async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Некорректный ID заказа" });
    }

    logger.info("API: GET отгрузки заказа", { orderId });

    const shipments = await ShipmentService.getShipmentsByOrderId(orderId);
    
    logger.info("API: Отгрузки заказа получены", { 
      orderId, 
      count: shipments.length 
    });

    res.json(shipments);
  } catch (error) {
    logger.error("API: Ошибка получения отгрузок заказа", { 
      orderId: req.params.orderId, 
      error: error.message 
    });
    next(error);
  }
});

/**
 * GET /api/orders/:orderId/shipments/:shipmentId - Получить отгрузку
 */
router.get("/:shipmentId", async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const shipmentId = parseInt(req.params.shipmentId);
    
    if (isNaN(orderId) || isNaN(shipmentId)) {
      return res.status(400).json({ error: "Некорректные параметры" });
    }

    logger.info("API: GET отгрузка", { orderId, shipmentId });

    const shipment = await ShipmentService.getShipmentById(orderId, shipmentId);
    
    if (!shipment) {
      logger.warn("API: Отгрузка не найдена", { orderId, shipmentId });
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }

    logger.info("API: Отгрузка получена", { orderId, shipmentId });
    res.json(shipment);
  } catch (error) {
    logger.error("API: Ошибка получения отгрузки", { 
      orderId: req.params.orderId, 
      shipmentId: req.params.shipmentId, 
      error: error.message 
    });
    next(error);
  }
});

/**
 * POST /api/orders/:orderId/shipments - Создать отгрузку
 */
router.post("/", validateBody(createShipmentSchema), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Некорректный ID заказа" });
    }

    // Проверяем что orderId в параметрах совпадает с orderId в теле запроса
    if (req.body.orderId && req.body.orderId !== orderId) {
      return res.status(400).json({ error: "ID заказа в URL и теле запроса не совпадают" });
    }

    const shipmentData = { ...req.body, orderId };

    logger.info("API: POST создание отгрузки", { 
      orderId, 
      itemsCount: shipmentData.items?.length || 0 
    });

    const shipment = await ShipmentService.createShipment(shipmentData);
    
    logger.info("API: Отгрузка создана", { 
      orderId, 
      shipmentId: shipment.id, 
      status: shipment.status 
    });

    res.status(201).json(shipment);
  } catch (error) {
    logger.error("API: Ошибка создания отгрузки", { 
      orderId: req.params.orderId, 
      error: error.message 
    });
    next(error);
  }
});

/**
 * PUT /api/orders/:orderId/shipments/:shipmentId - Обновить статус отгрузки
 */
router.put("/:shipmentId", async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const shipmentId = parseInt(req.params.shipmentId);
    
    if (isNaN(orderId) || isNaN(shipmentId)) {
      return res.status(400).json({ error: "Некорректные параметры" });
    }

    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: "Укажите новый статус отгрузки" });
    }

    const validStatuses = ["draft", "prepared", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Некорректный статус. Допустимые значения: ${validStatuses.join(", ")}` 
      });
    }

    logger.info("API: PUT обновление статуса отгрузки", { 
      orderId, 
      shipmentId, 
      newStatus: status 
    });

    const shipment = await ShipmentService.updateShipmentStatus(orderId, shipmentId, status);
    
    if (!shipment) {
      logger.warn("API: Отгрузка не найдена для обновления", { orderId, shipmentId });
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }

    logger.info("API: Статус отгрузки обновлен", { 
      orderId, 
      shipmentId, 
      newStatus: status 
    });

    res.json(shipment);
  } catch (error) {
    logger.error("API: Ошибка обновления отгрузки", { 
      orderId: req.params.orderId, 
      shipmentId: req.params.shipmentId, 
      error: error.message 
    });
    next(error);
  }
});

/**
 * DELETE /api/orders/:orderId/shipments/:shipmentId - Удалить отгрузку
 */
router.delete("/:shipmentId", async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const shipmentId = parseInt(req.params.shipmentId);
    
    if (isNaN(orderId) || isNaN(shipmentId)) {
      return res.status(400).json({ error: "Некорректные параметры" });
    }

    logger.info("API: DELETE отгрузка", { orderId, shipmentId });

    const deleted = await ShipmentService.deleteShipment(orderId, shipmentId);
    
    if (!deleted) {
      logger.warn("API: Отгрузка не найдена для удаления", { orderId, shipmentId });
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }

    logger.info("API: Отгрузка удалена", { orderId, shipmentId });
    res.json({ success: true, message: "Отгрузка удалена" });
  } catch (error) {
    logger.error("API: Ошибка удаления отгрузки", { 
      orderId: req.params.orderId, 
      shipmentId: req.params.shipmentId, 
      error: error.message 
    });
    next(error);
  }
});

export default router;