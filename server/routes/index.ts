import { Router } from "express";
import productRoutes from "./productRoutes";
import supplierRoutes from "./supplierRoutes";
import documentRoutes from "./documentRoutes";
import orderRoutes from "./orderRoutes";
import { InventoryService } from "../services/inventoryService";
import { ContractorService } from "../services/contractorService";
import { warehouseService } from "../services/warehouseService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";

const router = Router();

// Подключение модульных роутеров
router.use("/products", productRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/documents", documentRoutes);
router.use("/orders", orderRoutes);

// Сервисы для остальных API
const inventoryService = new InventoryService();
const contractorService = new ContractorService();
// warehouseService уже импортирован выше

// Валидация схемы для контрагентов
const deleteContractorsSchema = z.object({
  contractorIds: z.array(z.number()).min(1, "Укажите хотя бы одного контрагента для удаления"),
});

const deleteWarehousesSchema = z.object({
  warehouseIds: z.array(z.number()).min(1, "Укажите хотя бы один склад для удаления"),
});

// Маршруты для инвентаря
router.get("/inventory", async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
    const inventory = await inventoryService.getInventory(warehouseId);
    res.json(inventory);
  } catch (error) {
    apiLogger.error("Failed to get inventory", { warehouseId: req.query.warehouseId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения остатков" });
  }
});

router.get("/inventory/availability", async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
    const availability = await inventoryService.getInventoryAvailability(warehouseId);
    res.json(availability);
  } catch (error) {
    apiLogger.error("Failed to get inventory availability", { warehouseId: req.query.warehouseId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения доступности товаров" });
  }
});

// Маршруты для контрагентов
router.get("/contractors", async (req, res) => {
  try {
    const contractors = await contractorService.getAll();
    res.json(contractors);
  } catch (error) {
    apiLogger.error("Failed to get contractors", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения контрагентов" });
  }
});

router.get("/contractors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID контрагента" });
    }
    
    const contractor = await contractorService.getById(id);
    if (!contractor) {
      return res.status(404).json({ error: "Контрагент не найден" });
    }
    
    res.json(contractor);
  } catch (error) {
    apiLogger.error("Failed to get contractor", { contractorId: req.params.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения контрагента" });
  }
});

router.post("/contractors", async (req, res) => {
  try {
    const contractor = await contractorService.create(req.body);
    res.status(201).json(contractor);
  } catch (error) {
    apiLogger.error("Failed to create contractor", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка создания контрагента" });
  }
});

router.post("/contractors/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteContractorsSchema.parse(req.body);
    const result = await contractorService.deleteMultiple(validatedData.contractorIds);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete multiple contractors", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка удаления контрагентов" });
  }
});

router.post("/contractors/import", async (req, res) => {
  try {
    const { contractors } = req.body;
    if (!Array.isArray(contractors)) {
      return res.status(400).json({ error: "Ожидается массив контрагентов" });
    }
    
    const result = await contractorService.import(contractors);
    res.json(result);
  } catch (error) {
    apiLogger.error("Failed to import contractors", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка импорта контрагентов" });
  }
});

// Маршруты для складов
router.get("/warehouses", async (req, res) => {
  try {
    const warehouses = await warehouseService.getAll();
    res.json(warehouses);
  } catch (error) {
    apiLogger.error("Failed to get warehouses", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения складов" });
  }
});

router.get("/warehouses/:id", async (req, res) => {
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
    apiLogger.error("Failed to get warehouse", { warehouseId: req.params.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения склада" });
  }
});

router.post("/warehouses", async (req, res) => {
  try {
    const warehouse = await warehouseService.create(req.body);
    res.status(201).json(warehouse);
  } catch (error) {
    apiLogger.error("Failed to create warehouse", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка создания склада" });
  }
});

router.post("/warehouses/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteWarehousesSchema.parse(req.body);
    const result = await warehouseService.deleteMultiple(validatedData.warehouseIds);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    apiLogger.error("Failed to delete multiple warehouses", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка удаления складов" });
  }
});

router.post("/warehouses/import", async (req, res) => {
  try {
    const { warehouses } = req.body;
    if (!Array.isArray(warehouses)) {
      return res.status(400).json({ error: "Ожидается массив складов" });
    }
    
    const result = await warehouseService.import(warehouses);
    res.json(result);
  } catch (error) {
    apiLogger.error("Failed to import warehouses", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка импорта складов" });
  }
});

export default router;