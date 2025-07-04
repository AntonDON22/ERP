import { Router } from "express";
import { ShipmentService } from "../services/shipmentService";
import { createShipmentSchema } from "@shared/schema";
import { validateBody } from "../middleware/validation";
import { logger } from "@shared/logger";

const router = Router({ mergeParams: true }); // Включаем параметры из родительского роутера

/**
 * GET /api/orders/:orderId/shipments - Получить все отгрузки заказа
 */
router.get("/", async (req: any, res: any, next: any) => {
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
  } catch (error: any) {
    logger.error("Ошибка получения отгрузок заказа", { error });
    next(error);
  }
});

/**
 * POST /api/orders/:orderId/shipments - Создать отгрузку
 */
router.post("/", validateBody(createShipmentSchema), async (req: any, res: any, next: any) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Некорректный ID заказа" });
    }

    const shipmentData = { ...req.body, orderId };

    logger.info("API: POST создание отгрузки", { orderId, shipmentData });

    const newShipment = await ShipmentService.createShipment(shipmentData);
    
    logger.info("API: Отгрузка создана", { 
      orderId, 
      shipmentId: newShipment.id 
    });

    res.status(201).json(newShipment);
  } catch (error: any) {
    logger.error("Ошибка создания отгрузки", { error });
    next(error);
  }
});

/**
 * GET /api/orders/:orderId/shipments/:shipmentId - Получить отгрузку
 */
router.get("/:shipmentId", async (req: any, res: any, next: any) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const shipmentId = parseInt(req.params.shipmentId);
    
    if (isNaN(orderId) || isNaN(shipmentId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }

    logger.info("API: GET отгрузка", { orderId, shipmentId });

    const shipment = await ShipmentService.getShipmentById(orderId, shipmentId);
    
    if (!shipment) {
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }

    logger.info("API: Отгрузка получена", { orderId, shipmentId });

    res.json(shipment);
  } catch (error: any) {
    logger.error("Ошибка получения отгрузки", { error });
    next(error);
  }
});

/**
 * PUT /api/orders/:orderId/shipments/:shipmentId - Обновить статус отгрузки
 */
router.put("/:shipmentId", async (req: any, res: any, next: any) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const shipmentId = parseInt(req.params.shipmentId);
    
    if (isNaN(orderId) || isNaN(shipmentId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Статус обязателен" });
    }

    logger.info("API: PUT обновление статуса отгрузки", { 
      orderId, 
      shipmentId, 
      status 
    });

    const updatedShipment = await ShipmentService.updateShipmentStatus(
      orderId,
      shipmentId,
      status
    );

    if (!updatedShipment) {
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }

    logger.info("API: Статус отгрузки обновлен", { 
      orderId, 
      shipmentId, 
      newStatus: status 
    });

    res.json(updatedShipment);
  } catch (error: any) {
    logger.error("Ошибка обновления статуса отгрузки", { error });
    next(error);
  }
});

/**
 * DELETE /api/orders/:orderId/shipments/:shipmentId - Удалить отгрузку
 */
router.delete("/:shipmentId", async (req: any, res: any, next: any) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const shipmentId = parseInt(req.params.shipmentId);
    
    if (isNaN(orderId) || isNaN(shipmentId)) {
      return res.status(400).json({ error: "Некорректные ID" });
    }

    logger.info("API: DELETE отгрузка", { orderId, shipmentId });

    const deleted = await ShipmentService.deleteShipment(orderId, shipmentId);

    if (!deleted) {
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }

    logger.info("API: Отгрузка удалена", { orderId, shipmentId });

    res.json({ message: "Отгрузка удалена" });
  } catch (error: any) {
    logger.error("Ошибка удаления отгрузки", { error });
    next(error);
  }
});

export default router;