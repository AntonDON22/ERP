import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, z } from "zod";
import { zId, zIdString } from "../../shared/zFields";

/**
 * Middleware для валидации тела запроса с помощью Zod схемы
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          error: "Ошибка валидации данных",
          details: validationErrors,
          success: false,
        });
      }

      next(error);
    }
  };
}

/**
 * Middleware для валидации параметров запроса
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          error: "Ошибка валидации параметров",
          details: validationErrors,
          success: false,
        });
      }

      next(error);
    }
  };
}

/**
 * Middleware для валидации query параметров
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          error: "Ошибка валидации query параметров",
          details: validationErrors,
          success: false,
        });
      }

      next(error);
    }
  };
}

/**
 * ✅ Схема для валидации ID в параметрах - использует централизованное поле zFields.ts
 */
export const idParamSchema = z.object({
  id: zIdString, // ✅ Мигрировано на централизованное поле
});

/**
 * ✅ Схемы для валидации массивов ID - используют централизованные поля zFields.ts
 */
export const productIdsSchema = z.object({
  productIds: z.array(zId).min(1, "Укажите хотя бы один ID товара"), // ✅ Мигрировано
});

export const supplierIdsSchema = z.object({
  supplierIds: z.array(zId).min(1, "Укажите хотя бы один ID поставщика"), // ✅ Мигрировано
});

export const contractorIdsSchema = z.object({
  contractorIds: z.array(zId).min(1, "Укажите хотя бы один ID контрагента"), // ✅ Мигрировано
});

export const documentIdsSchema = z.object({
  documentIds: z.array(zId).min(1, "Укажите хотя бы один ID документа"), // ✅ Мигрировано
});

export const orderIdsSchema = z.object({
  orderIds: z.array(zId).min(1, "Укажите хотя бы один ID заказа"), // ✅ Мигрировано
});

export const warehouseIdsSchema = z.object({
  warehouseIds: z.array(zId).min(1, "Укажите хотя бы один ID склада"), // ✅ Мигрировано
});

export const shipmentIdsSchema = z.object({
  shipmentIds: z.array(zId).min(1, "Укажите хотя бы один ID отгрузки"), // ✅ Мигрировано
});
