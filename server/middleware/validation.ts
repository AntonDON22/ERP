import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, z } from "zod";

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
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: "Ошибка валидации данных",
          details: validationErrors,
          success: false
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
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: "Ошибка валидации параметров",
          details: validationErrors,
          success: false
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
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: "Ошибка валидации query параметров",
          details: validationErrors,
          success: false
        });
      }
      
      next(error);
    }
  };
}

/**
 * Схема для валидации ID в параметрах
 */
export const idParamSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, "ID должен содержать только цифры")
    .transform(Number)
    .refine(val => val > 0, "ID должен быть положительным")
});

/**
 * Схемы для валидации массивов ID в теле запроса
 */
export const productIdsSchema = z.object({
  productIds: z.array(
    z.number()
      .positive("ID должен быть положительным")
      .int("ID должен быть целым числом")
  ).min(1, "Укажите хотя бы один ID товара")
});

export const supplierIdsSchema = z.object({
  supplierIds: z.array(
    z.number()
      .positive("ID должен быть положительным")
      .int("ID должен быть целым числом")
  ).min(1, "Укажите хотя бы один ID поставщика")
});

export const contractorIdsSchema = z.object({
  contractorIds: z.array(
    z.number()
      .positive("ID должен быть положительным")
      .int("ID должен быть целым числом")
  ).min(1, "Укажите хотя бы один ID контрагента")
});

export const documentIdsSchema = z.object({
  documentIds: z.array(
    z.number()
      .positive("ID должен быть положительным")
      .int("ID должен быть целым числом")
  ).min(1, "Укажите хотя бы один ID документа")
});

export const orderIdsSchema = z.object({
  orderIds: z.array(
    z.number()
      .positive("ID должен быть положительным")
      .int("ID должен быть целым числом")
  ).min(1, "Укажите хотя бы один ID заказа")
});

export const warehouseIdsSchema = z.object({
  warehouseIds: z.array(
    z.number()
      .positive("ID должен быть положительным")
      .int("ID должен быть целым числом")
  ).min(1, "Укажите хотя бы один ID склада")
});