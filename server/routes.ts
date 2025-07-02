import type { Express } from "express";
import { createServer, type Server } from "http";
import apiRoutes from "./routes/index";
import { apiLogger } from "../shared/logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // Используем модульные роутеры
  app.use("/api", apiRoutes);



  // Обработка ошибок
  app.use((err: any, req: any, res: any, next: any) => {
    apiLogger.error("Unhandled route error", { 
      error: err instanceof Error ? err.message : String(err),
      path: req.path,
      method: req.method 
    });
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  });

  const httpServer = createServer(app);
  return httpServer;
}