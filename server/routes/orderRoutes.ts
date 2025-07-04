import { Router } from "express";
import { OrderService } from "../services/orderService";
import { paginationService } from "../services/paginationService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger, logger, getErrorMessage } from "../../shared/logger";
import shipmentRoutes from "./shipmentRoutes";

const router = Router();

// Валидация для параметров ID
const idParamSchema = z.object({
  id: z.string().refine((val) => !isNaN(Number(val)), {
    message: "ID должен быть числом",
  }).transform((val) => Number(val)),
});

// Валидация для удаления заказов
const deleteOrdersSchema = z.object({
  orderIds: z.array(z.number()).min(1, "Укажите хотя бы один заказ для удаления"),
});

// GET /api/orders с поддержкой пагинации
router.get("/", async (req, res) => {
  try {
    const hasPageParam = req.query.page !== undefined;
    const orderService = OrderService.getInstance();
    
    if (hasPageParam) {
      const params = paginationService.parseParams(req.query);
      const normalizedParams = paginationService.normalizeParams(params);
      const orders = await orderService.getAllPaginated(normalizedParams);
      const total = await orderService.getCount();
      const result = paginationService.createResult(orders, total, normalizedParams);
      
      paginationService.logUsage("/api/orders", normalizedParams, total);
      res.json(result);
    } else {
      const orders = await orderService.getAll();
      res.json(orders);
    }
  } catch (error) {
    apiLogger.error("Failed to get orders", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения заказов" });
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID заказа" });
    }

    const order = await OrderService.getInstance().getById(id);
    if (!order) {
      return res.status(404).json({ error: "Заказ не найден" });
    }

    res.json(order);
  } catch (error) {
    apiLogger.error("Failed to get order", {
      orderId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения заказа" });
  }
});

// GET /api/orders/:id/items
router.get("/:id/items", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID заказа" });
    }

    const orderItems = await OrderService.getOrderItems(id);
    res.json(orderItems);
  } catch (error) {
    apiLogger.error("Failed to get order items", {
      orderId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения позиций заказа" });
  }
});

// POST /api/orders/create
router.post("/create", async (req, res) => {
  try {
    const { items, isReserved, ...orderData } = req.body;
    const order = await OrderService.create(orderData, items || [], isReserved || false);
    res.status(201).json(order);
  } catch (error) {
    apiLogger.error("Failed to create order", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка создания заказа" });
  }
});

// PUT /api/orders/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID заказа" });
    }

    const { items, isReserved, ...orderData } = req.body;
    apiLogger.info("Updating order", { orderId: id, orderData, hasItems: !!items, isReserved });

    const order = await OrderService.update(id, orderData, items, isReserved);
    if (!order) {
      return res.status(404).json({ error: "Заказ не найден" });
    }

    res.json(order);
  } catch (error) {
    apiLogger.error("Failed to update order", {
      orderId: req.params.id,
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка обновления заказа" });
  }
});

// DELETE /api/orders/:id
router.delete("/:id", async (req, res) => {
  try {
    const idParam = idParamSchema.parse(req.params);
    const success = await OrderService.getInstance().delete(idParam.id);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Заказ не найден" });
    }
  } catch (error) {
    logger.error("Ошибка удаления заказа", { error: getErrorMessage(error) });
    res.status(500).json({ error: "Ошибка удаления заказа" });
  }
});

// POST /api/orders/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteOrdersSchema.parse(req.body);
    const result = await OrderService.getInstance().deleteMultiple(validatedData.orderIds);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete multiple orders", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления заказов" });
  }
});

// Подключение вложенного роутера для отгрузок
// Пример: GET /api/orders/123/shipments
router.use("/:orderId/shipments", shipmentRoutes);

export default router;
