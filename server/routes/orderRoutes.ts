import { Router } from "express";
import { OrderService } from "../services/orderService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";

const router = Router();
const orderService = new OrderService();

// Валидация для удаления заказов
const deleteOrdersSchema = z.object({
  orderIds: z.array(z.number()).min(1, "Укажите хотя бы один заказ для удаления"),
});

// GET /api/orders
router.get("/", async (req, res) => {
  try {
    const orders = await orderService.getAll();
    res.json(orders);
  } catch (error) {
    apiLogger.error("Failed to get orders", { error: error instanceof Error ? error.message : String(error) });
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
    
    const order = await orderService.getById(id);
    if (!order) {
      return res.status(404).json({ error: "Заказ не найден" });
    }
    
    res.json(order);
  } catch (error) {
    apiLogger.error("Failed to get order", { orderId: req.params.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения заказа" });
  }
});

// POST /api/orders/create
router.post("/create", async (req, res) => {
  try {
    const { items, isReserved, ...orderData } = req.body;
    const order = await orderService.create(orderData, items || [], isReserved || false);
    res.status(201).json(order);
  } catch (error) {
    apiLogger.error("Failed to create order", { body: req.body, error: error instanceof Error ? error.message : String(error) });
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
    
    const order = await orderService.update(id, req.body);
    if (!order) {
      return res.status(404).json({ error: "Заказ не найден" });
    }
    
    res.json(order);
  } catch (error) {
    apiLogger.error("Failed to update order", { orderId: req.params.id, body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка обновления заказа" });
  }
});

// POST /api/orders/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteOrdersSchema.parse(req.body);
    const result = await orderService.deleteMultiple(validatedData.orderIds);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete multiple orders", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка удаления заказов" });
  }
});

export default router;