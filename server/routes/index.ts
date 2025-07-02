import { Router } from "express";
import productRoutes from "./productRoutes";
import supplierRoutes from "./supplierRoutes";
import documentRoutes from "./documentRoutes";
import orderRoutes from "./orderRoutes";
import logRoutes from "./logRoutes";
import { InventoryService } from "../services/inventoryService";
import { ContractorService } from "../services/contractorService";
import { WarehouseService } from "../services/warehouseService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";
import { readFileSync } from "fs";
import { parseChangelogFromReplit } from "../../shared/changelogParser";

const router = Router();

// Подключение модульных роутеров
router.use("/products", productRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/documents", documentRoutes);
router.use("/orders", orderRoutes);
router.use("/logs", logRoutes);

// Сервисы для остальных API
const inventoryService = new InventoryService();
const contractorService = new ContractorService();
const warehouseService = new WarehouseService();

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

router.get("/inventory/availability", async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
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

// Endpoint для материализованных представлений
router.get("/materialized-views/status", async (req, res) => {
  try {
    res.json({
      status: "active",
      views: [
        { name: "inventory_summary", active: true },
        { name: "inventory_availability", active: true }
      ]
    });
  } catch (error) {
    apiLogger.error("Failed to check materialized views status", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка проверки статуса представлений" });
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

router.post("/contractors", async (req, res) => {
  try {
    const contractor = await contractorService.create(req.body);
    res.status(201).json(contractor);
  } catch (error) {
    apiLogger.error("Failed to create contractor", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка создания контрагента" });
  }
});

router.delete("/contractors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID контрагента" });
    }
    
    const success = await contractorService.deleteById(id);
    if (!success) {
      return res.status(404).json({ error: "Контрагент не найден" });
    }
    
    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete contractor", { contractorId: req.params.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка удаления контрагента" });
  }
});

// POST /api/contractors/delete-multiple  
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

router.post("/warehouses", async (req, res) => {
  try {
    const warehouse = await warehouseService.create(req.body);
    res.status(201).json(warehouse);
  } catch (error) {
    apiLogger.error("Failed to create warehouse", { body: req.body, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка создания склада" });
  }
});

router.delete("/warehouses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID склада" });
    }
    
    const success = await warehouseService.deleteById(id);
    if (!success) {
      return res.status(404).json({ error: "Склад не найден" });
    }
    
    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete warehouse", { warehouseId: req.params.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка удаления склада" });
  }
});

// POST /api/warehouses/delete-multiple
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

// GET /api/changelog - получение истории обновлений из replit.md
router.get("/changelog", async (req, res) => {
  try {
    const replitContent = readFileSync('./replit.md', 'utf-8');
    const dayData = parseChangelogFromReplit(replitContent);
    res.json(dayData);
  } catch (error) {
    apiLogger.error("Failed to get changelog", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Ошибка получения истории обновлений" });
  }
});

export default router;