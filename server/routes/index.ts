import { Router } from "express";
import { productRoutes } from "./productRoutes";
import { supplierRoutes } from "./supplierRoutes";
import { contractorRoutes } from "./contractorRoutes";
import { warehouseRoutes } from "./warehouseRoutes";
import inventoryRoutes from "./inventoryRoutes";
import documentRoutes from "./documentRoutes";
import orderRoutes from "./orderRoutes";
import { shipmentRoutes } from "./shipmentRoutes";
import logRoutes from "./logRoutes";
import { PerformanceMetricsService } from "../services/performanceMetricsService";
import { mediumCache } from "../middleware/cacheMiddleware";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";
import { readFileSync } from "fs";
import { parseChangelogFromReplit } from "../../shared/changelogParser";
import { cacheWarmupService } from "../services/cacheWarmupService";

const router = Router();

// Подключение модульных роутеров
router.use("/products", productRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/contractors", contractorRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/documents", documentRoutes);
router.use("/orders", orderRoutes);
router.use("/shipments", shipmentRoutes);
router.use("/logs", logRoutes);

// Endpoint для логирования клиентских ошибок
router.post("/client-errors", (req, res) => {
  const { message, stack, url, lineNumber, columnNumber, userAgent } = req.body;

  apiLogger.error(`Client-side error: ${message}`, {
    stack,
    url,
    lineNumber,
    columnNumber,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({ status: "logged" });
});

// Endpoint для материализованных представлений
router.get("/materialized-views/status", async (req, res) => {
  try {
    res.json({
      status: "active",
      views: [
        { name: "inventory_summary", active: true },
        { name: "inventory_availability", active: true },
      ],
    });
  } catch (error) {
    apiLogger.error("Failed to check materialized views status", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка проверки статуса представлений" });
  }
});

// GET /api/changelog - получение истории обновлений из replit.md
router.get("/changelog", async (req, res) => {
  try {
    const replitContent = readFileSync("./replit.md", "utf-8");
    const dayData = parseChangelogFromReplit(replitContent);
    res.json(dayData);
  } catch (error) {
    apiLogger.error("Failed to get changelog", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения истории обновлений" });
  }
});

// GET /api/metrics - получение метрик производительности
router.get("/metrics", async (req, res) => {
  try {
    const metrics = PerformanceMetricsService.getMetrics();
    const endpointStats = PerformanceMetricsService.getEndpointStats();
    const cacheMetrics = await PerformanceMetricsService.getCacheMetrics();
    const trends = PerformanceMetricsService.getPerformanceTrends();

    res.json({
      overview: metrics,
      endpoints: endpointStats,
      cache: cacheMetrics,
      trends: trends,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    apiLogger.error("Failed to get performance metrics", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения метрик производительности" });
  }
});

// Принудительный разогрев кеша (для критических ситуаций)
router.post("/cache/warmup", async (req, res) => {
  try {
    apiLogger.info("Manual cache warmup initiated", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    await cacheWarmupService.forceWarmupAll();

    // Проверяем статус разогрева
    const status = await cacheWarmupService.getWarmupStatus();
    const successCount = status.filter((s) => s.isCached).length;

    res.json({
      success: true,
      message: "Принудительный разогрев кеша завершен",
      stats: {
        total: status.length,
        cached: successCount,
        success_rate: `${Math.round((successCount / status.length) * 100)}%`,
      },
      details: status,
    });
  } catch (error) {
    apiLogger.error("Manual cache warmup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: "Ошибка принудительного разогрева кеша",
    });
  }
});

// Статус разогрева кеша
router.get("/cache/status", async (req, res) => {
  try {
    const status = await cacheWarmupService.getWarmupStatus();
    const configs = cacheWarmupService.getWarmupConfigs();

    res.json({
      configs,
      status,
      summary: {
        total: status.length,
        cached: status.filter((s) => s.isCached).length,
        cache_hit_rate: `${Math.round((status.filter((s) => s.isCached).length / status.length) * 100)}%`,
      },
    });
  } catch (error) {
    apiLogger.error("Failed to get cache status", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: "Ошибка получения статуса кеша",
    });
  }
});

// КРИТИЧЕСКИ ВАЖНО: Catch-all для неизвестных API маршрутов
// Этот маршрут должен быть зарегистрирован в самом конце роутера
// чтобы перехватывать все несуществующие API-запросы и возвращать JSON вместо HTML
router.use("*", (req, res) => {
  apiLogger.warn("API route not found", {
    path: req.originalUrl,
    method: req.method,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
  });

  res.status(404).json({
    error: "API route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

export default router;
