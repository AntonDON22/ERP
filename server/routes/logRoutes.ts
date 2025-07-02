import { Router } from "express";
import { storage } from "../storage";
import { Request, Response } from "express";
import { z } from "zod";

const router = Router();

// Схема валидации для параметров запроса логов
const getLogsSchema = z.object({
  level: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).optional(),
  module: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val) || 100)
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val) || 0)
    .optional(),
});

// GET /api/logs - получить логи с фильтрацией
router.get("/", async (req: Request, res: Response) => {
  try {
    // Валидация параметров запроса
    const params = getLogsSchema.parse(req.query);

    // Получаем логи из хранилища
    const logs = await storage.getLogs(params);

    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching logs:", error);

    if (error.name === "ZodError") {
      res.status(400).json({
        error: "Invalid query parameters",
        details: error.errors,
      });
      return;
    }

    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// GET /api/logs/modules - получить список доступных модулей
router.get("/modules", async (req: Request, res: Response) => {
  try {
    const modules = await storage.getLogModules();
    res.json(modules);
  } catch (error) {
    console.error("Error fetching log modules:", error);
    res.status(500).json({ error: "Failed to fetch log modules" });
  }
});

export default router;
