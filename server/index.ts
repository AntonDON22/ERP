import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logRequests, logErrors } from "./middleware/logging";
import { logger } from "@shared/logger";
import { cacheWarmupService } from "./services/cacheWarmupService";

const app = express();
app.set("trust proxy", 1); // Доверяем первому прокси для корректной работы rate limiter

// 🔐 КРИТИЧЕСКИЕ SECURITY MIDDLEWARE
// CORS configuration для защиты от cross-origin атак
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security headers для защиты от XSS, clickjacking и других атак
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval для Vite HMR
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"], // WebSocket для HMR
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Отключаем для совместимости с Vite
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting для защиты от спама и DoS атак
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // максимум 1000 запросов с одного IP за 15 минут
  message: {
    error: "Слишком много запросов с вашего IP, попробуйте позже",
  },
  standardHeaders: true, // возвращать rate limit info в заголовках `RateLimit-*`
  legacyHeaders: false, // отключить заголовки `X-RateLimit-*`
});

// Более строгие лимиты для API маршрутов
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 300, // Снижено с 500 для усиления безопасности
  message: {
    error: "Слишком много API запросов с вашего IP, попробуйте позже",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Критичные лимиты для операций изменения данных
const mutationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 минут
  max: 30, // Максимум 30 POST/PUT/DELETE за 10 минут
  message: {
    error: "Слишком много операций изменения данных, попробуйте позже",
  },
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS',
});

app.use(limiter);
app.use("/api", apiLimiter);
app.use("/api", mutationLimiter);

// Добавляем централизованное логирование для API запросов
app.use("/api", logRequests);

// КРИТИЧЕСКИ ВАЖНО: Принудительно устанавливаем Content-Type: application/json для всех API запросов
// Это предотвращает возврат HTML вместо JSON из-за конфликтов с SSR
app.use("/api", (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Middleware для обработки ошибок
  app.use(logErrors);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Логируем ошибку сервера
    logger.error(`Server error: ${message}`, {
      method: req.method,
      url: req.url,
      status,
      stack: err.stack,
      userAgent: req.get("User-Agent"),
    });

    res.status(status).json({ message });
  });

  // КРИТИЧЕСКИ ВАЖНО: Перехват неизвестных API-запросов
  // Этот middleware должен быть зарегистрирован ПОСЛЕ всех API маршрутов,
  // но ДО фронтенд-фолбэка, чтобы гарантировать возврат JSON вместо HTML
  app.use("/api/*", (req, res) => {
    logger.warn("API route not found", {
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });

    res.status(404).json({
      error: "API route not found",
      path: req.path,
      method: req.method,
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      logger.info(`Server started successfully`, {
        port,
        host: "0.0.0.0",
        environment: app.get("env"),
        pid: process.pid,
      });

      // Запускаем разогрев кеша после запуска сервера
      try {
        await cacheWarmupService.warmupCache();
      } catch (error) {
        logger.error("Критическая ошибка разогрева кеша при запуске сервера", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
})();
