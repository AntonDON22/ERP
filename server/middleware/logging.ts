import { Request, Response, NextFunction } from "express";
import { apiLogger, getErrorMessage } from "@shared/logger";

// Middleware для логирования всех API запросов
export function logRequests(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const { method, url, body, query } = req;

  // Логируем начало запроса
  apiLogger.info(`${method} ${url}`, {
    method,
    url,
    query: Object.keys(query).length > 0 ? query : undefined,
    bodySize: body ? JSON.stringify(body).length : 0,
  });

  // Перехватываем завершение ответа
  const originalSend = res.send;
  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    // Логируем завершение запроса
    if (statusCode >= 400) {
      apiLogger.error(`${method} ${url} - ${statusCode}`, {
        method,
        url,
        statusCode,
        duration,
        responseSize: body ? String(body).length : 0,
      });
    } else {
      apiLogger.performance(`${method} ${url}`, duration, {
        statusCode,
        responseSize: body ? String(body).length : 0,
      });
    }

    return originalSend.call(this, body);
  };

  next();
}

// Middleware для логирования ошибок
export function logErrors(err: any, req: Request, res: Response, next: NextFunction) {
  const { method, url } = req;

  apiLogger.error(`Unhandled error in ${method} ${url}`, {
    method,
    url,
    error: getErrorMessage(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  next(err);
}
