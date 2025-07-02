/**
 * 🔧 Универсальные схемы валидации числовых полей с автоматическим преобразованием строк
 * 
 * Решает проблему когда HTML формы передают числовые значения как строки,
 * а валидационные схемы ожидают числа. Автоматически преобразует строки в числа
 * с правильными сообщениями об ошибках на русском языке.
 */

import { z } from "zod";

/**
 * Базовая схема для числовых полей с автопреобразованием строк
 * 
 * Принимает строку или число, автоматически преобразует строку в число
 * Выбрасывает понятную ошибку если значение не является числом
 */
const createNumberField = (fieldName: string = "Поле") => {
  return z.union([z.string(), z.number()])
    .transform((val, ctx) => {
      // Если уже число - возвращаем как есть
      if (typeof val === 'number') {
        return val;
      }
      
      // Если строка пустая или только пробелы - ошибка
      if (typeof val === 'string' && val.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} должно быть числом`,
        });
        return z.NEVER;
      }
      
      // Преобразуем строку в число
      const parsed = Number(val);
      
      // Проверяем корректность преобразования
      if (isNaN(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} должно быть числом`,
        });
        return z.NEVER;
      }
      
      return parsed;
    });
};

/**
 * Схема для денежных полей (цены, стоимости)
 * 
 * Автоматически преобразует строки в числа
 * Проверяет что значение не отрицательное
 * Ограничивает максимальное значение разумным пределом
 */
export const zPrice = createNumberField("Цена")
  .refine((val) => val >= 0, "Цена не может быть отрицательной")
  .refine((val) => val <= 999999999.99, "Цена слишком большая")
  .refine((val) => {
    // Проверяем количество знаков после запятой (максимум 2)
    const decimalPlaces = (val.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  }, "Цена может содержать максимум 2 знака после запятой");

/**
 * Схема для полей количества (товары, остатки)
 * 
 * Автоматически преобразует строки в числа
 * Проверяет что количество не отрицательное (включая 0)
 * Поддерживает дробные значения с точностью до 3 знаков
 */
export const zQuantity = createNumberField("Количество")
  .refine((val) => val >= 0, "Количество не может быть отрицательным")
  .refine((val) => val <= 999999, "Количество слишком большое")
  .refine((val) => {
    // Проверяем количество знаков после запятой (максимум 3)
    const decimalPlaces = (val.toString().split('.')[1] || '').length;
    return decimalPlaces <= 3;
  }, "Количество может содержать максимум 3 знака после запятой");

/**
 * Схема для целых количеств (заказы, штучные товары)
 */
export const zQuantityInteger = createNumberField("Количество")
  .refine((val) => val > 0, "Количество должно быть больше нуля")
  .refine((val) => val <= 999999, "Количество слишком большое")
  .refine((val) => Number.isInteger(val), "Количество должно быть целым числом");

/**
 * Схема для полей количества которое может быть нулевым
 * 
 * Используется для остатков, резервов где ноль - валидное значение
 */
export const zQuantityNullable = createNumberField("Количество")
  .refine((val) => val >= 0, "Количество не может быть отрицательным")
  .refine((val) => val <= 999999, "Количество слишком большое")
  .refine((val) => {
    const decimalPlaces = (val.toString().split('.')[1] || '').length;
    return decimalPlaces <= 3;
  }, "Количество может содержать максимум 3 знака после запятой");

/**
 * Схема для процентных полей (скидки, наценки)
 * 
 * Автоматически преобразует строки в числа
 * Ограничивает диапазон от 0 до 100 процентов
 */
export const zPercent = createNumberField("Процент")
  .refine((val) => val >= 0, "Процент не может быть отрицательным")
  .refine((val) => val <= 100, "Процент не может быть больше 100")
  .refine((val) => {
    const decimalPlaces = (val.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  }, "Процент может содержать максимум 2 знака после запятой");

/**
 * Схема для ID полей
 * 
 * Автоматически преобразует строки в числа
 * Проверяет что ID положительное целое число
 */
export const zId = createNumberField("ID")
  .refine((val) => val > 0, "ID должен быть положительным числом")
  .refine((val) => Number.isInteger(val), "ID должен быть целым числом")
  .refine((val) => val <= 2147483647, "ID слишком большой"); // Максимальное значение INTEGER в PostgreSQL

/**
 * Схема для веса товаров
 * 
 * Автоматически преобразует строки в числа
 * Поддерживает дробные значения для точного взвешивания
 */
export const zWeight = createNumberField("Вес")
  .refine((val) => val >= 0, "Вес не может быть отрицательным")
  .refine((val) => val <= 999999, "Вес слишком большой")
  .refine((val) => {
    const decimalPlaces = (val.toString().split('.')[1] || '').length;
    return decimalPlaces <= 3;
  }, "Вес может содержать максимум 3 знака после запятой");

/**
 * Опциональные версии основных схем
 * 
 * Используются когда поле может быть пустым или undefined
 */
export const zPriceOptional = zPrice.optional();
export const zQuantityOptional = zQuantity.optional();
export const zPercentOptional = zPercent.optional();
export const zWeightOptional = zWeight.optional();

/**
 * Схемы для строковых представлений чисел (legacy поддержка)
 * 
 * Используются в случаях когда API должен принимать строки
 * но с валидацией что они содержат корректные числа
 */
export const zPriceString = z.string()
  .refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0), "Введите корректное значение цены")
  .refine((val) => val === "" || Number(val) <= 999999999.99, "Цена слишком большая");

export const zQuantityString = z.string()
  .refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0), "Введите корректное количество")
  .refine((val) => val === "" || Number(val) <= 999999, "Количество слишком большое");

export const zWeightString = z.string()
  .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Введите корректное значение веса")
  .refine((val) => !val || Number(val) <= 999999, "Вес слишком большой");

export const zDimensionString = z.string()
  .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Введите корректное значение размера")
  .refine((val) => !val || Number(val) <= 999999, "Размер слишком большой");

/**
 * Утилитарные функции для ручного преобразования
 */
export const parsePrice = (value: string | number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (isNaN(parsed)) throw new Error('Некорректное значение цены');
  return parsed;
};

export const parseQuantity = (value: string | number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (isNaN(parsed)) throw new Error('Некорректное значение количества');
  return parsed;
};

/**
 * Типы для использования в TypeScript
 */
export type Price = z.infer<typeof zPrice>;
export type Quantity = z.infer<typeof zQuantity>;
export type Percent = z.infer<typeof zPercent>;
export type Weight = z.infer<typeof zWeight>;