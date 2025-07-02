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
 * Использует z.coerce.number() для надежного преобразования строк в числа
 * Обрабатывает случаи когда API получает число (1000) вместо строки ("1000")
 * Решает проблемы FIFO-валидации при значениях 0 и -1
 */
const createNumberField = (fieldName: string = "Поле") => {
  return z.coerce.number({
    errorMap: (issue, ctx) => {
      if (issue.code === z.ZodIssueCode.invalid_type) {
        return { message: `${fieldName} должно быть числом` };
      }
      return { message: `Некорректное значение поля ${fieldName}` };
    },
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
    const decimalPlaces = (val.toString().split(".")[1] || "").length;
    return decimalPlaces <= 2;
  }, "Цена может содержать максимум 2 знака после запятой");

/**
 * Схема для полей количества (товары, остатки)
 *
 * Используется для операций, где количество должно быть положительным
 * (например, создание заказа, приход товара, ввод пользователем)
 * Автоматически преобразует строки в числа
 * Проверяет что количество больше нуля
 * Поддерживает дробные значения с точностью до 3 знаков
 */
export const zQuantity = createNumberField("Количество")
  .refine((val) => val > 0, "Количество должно быть больше нуля")
  .refine((val) => val <= 999999, "Количество слишком большое")
  .refine((val) => {
    // Проверяем количество знаков после запятой (максимум 3)
    const decimalPlaces = (val.toString().split(".")[1] || "").length;
    return decimalPlaces <= 3;
  }, "Количество может содержать максимум 3 знака после запятой");

/**
 * Схема для полей количества которое может быть нулевым
 *
 * Используется для остатков, резервов, нулевых возвратов, начальных значений,
 * неактивных строк где ноль - валидное значение
 * Автоматически преобразует строки в числа
 * Поддерживает дробные значения с точностью до 3 знаков
 */
export const zQuantityAllowZero = createNumberField("Количество")
  .refine((val) => val >= 0, "Количество не может быть отрицательным")
  .refine((val) => val <= 999999, "Количество слишком большое")
  .refine((val) => {
    const decimalPlaces = (val.toString().split(".")[1] || "").length;
    return decimalPlaces <= 3;
  }, "Количество может содержать максимум 3 знака после запятой");

/**
 * Схема для количества которое может быть отрицательным
 *
 * Используется при списаниях, возвратах, движении товара в минус,
 * складских корректировках, операциях расхода
 * Автоматически преобразует строки в числа
 * Принимает любые целые числа (положительные, отрицательные, ноль)
 */
export const zQuantityCanBeNegative = createNumberField("Количество")
  .refine((val) => Number.isInteger(val), "Количество должно быть целым числом")
  .refine(
    (val) => val >= -999999 && val <= 999999,
    "Количество вне допустимого диапазона (-999999 до 999999)"
  );

/**
 * Схема для целых количеств (заказы, штучные товары)
 */
export const zQuantityInteger = createNumberField("Количество")
  .refine((val) => val > 0, "Количество должно быть больше нуля")
  .refine((val) => val <= 999999, "Количество слишком большое")
  .refine((val) => Number.isInteger(val), "Количество должно быть целым числом");

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
    const decimalPlaces = (val.toString().split(".")[1] || "").length;
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
    const decimalPlaces = (val.toString().split(".")[1] || "").length;
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
 * Схема для названий сущностей (документы, заказы, продукты)
 *
 * Стандартное поле названия с валидацией длины и обрезкой пробелов
 * Используется во всех сущностях системы для унификации правил
 */
export const zName = z
  .string()
  .min(1, "Название обязательно")
  .max(255, "Название не должно превышать 255 символов")
  .trim();

export const zNameOptional = zName.optional();

/**
 * Специальное поле для названий документов с автогенерацией
 * Поддерживает пустые значения, которые будут заменены автоматически
 */
export const zDocumentName = z
  .string()
  .max(255, "Название не должно превышать 255 символов")
  .trim()
  .optional()
  .default("");

/**
 * Поле для примечаний и заметок
 * Максимум 1000 символов, поддерживает пустые значения
 */
export const zNotes = z
  .string()
  .max(1000, "Примечания не должны превышать 1000 символов")
  .trim()
  .optional()
  .transform((val) => val || undefined);

/**
 * Поле для дат в строковом формате
 * Проверяет что строка может быть преобразована в валидную дату
 */
export const zDate = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), "Некорректная дата")
  .optional();

/**
 * Статус заказа - только допустимые значения
 */
export const zOrderStatus = z.enum(["Новый", "В работе", "Выполнен", "Отменен"], {
  errorMap: () => ({ message: "Некорректный статус заказа" }),
});

export const zOrderStatusOptional = zOrderStatus.optional();

/**
 * ID в строковом формате (для URL параметров)
 * Автоматически преобразует строку в число после валидации
 */
export const zIdString = z
  .string()
  .regex(/^\d+$/, "ID должен содержать только цифры")
  .transform(Number)
  .refine(
    (val) => val > 0 && val <= Number.MAX_SAFE_INTEGER,
    "ID должен быть положительным числом"
  );

/**
 * Схемы для строковых представлений чисел (legacy поддержка)
 *
 * Используются в случаях когда API должен принимать строки
 * но с валидацией что они содержат корректные числа
 */
export const zPriceString = z
  .string()
  .refine(
    (val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0),
    "Введите корректное значение цены"
  )
  .refine((val) => val === "" || Number(val) <= 999999999.99, "Цена слишком большая");

export const zQuantityString = z
  .string()
  .refine(
    (val) => val === "" || (!isNaN(Number(val)) && Number(val) > 0),
    "Введите корректное количество больше нуля"
  )
  .refine((val) => val === "" || Number(val) <= 999999, "Количество слишком большое");

export const zQuantityAllowZeroString = z
  .string()
  .refine(
    (val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0),
    "Введите корректное количество (0 или больше)"
  )
  .refine((val) => val === "" || Number(val) <= 999999, "Количество слишком большое");

export const zQuantityCanBeNegativeString = z
  .string()
  .refine(
    (val) => val === "" || (!isNaN(Number(val)) && Number.isInteger(Number(val))),
    "Введите корректное целое число"
  )
  .refine(
    (val) => val === "" || (Number(val) >= -999999 && Number(val) <= 999999),
    "Количество вне допустимого диапазона"
  );

export const zWeightString = z
  .string()
  .refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
    "Введите корректное значение веса"
  )
  .refine((val) => !val || Number(val) <= 999999, "Вес слишком большой");

export const zDimensionString = z
  .string()
  .refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
    "Введите корректное значение размера"
  )
  .refine((val) => !val || Number(val) <= 999999, "Размер слишком большой");

/**
 * Утилитарные функции для ручного преобразования
 */
export const parsePrice = (value: string | number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (isNaN(parsed)) throw new Error("Некорректное значение цены");
  return parsed;
};

export const parseQuantity = (value: string | number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (isNaN(parsed)) throw new Error("Некорректное значение количества");
  return parsed;
};

/**
 * Типы для использования в TypeScript
 */
export type Price = z.infer<typeof zPrice>;
export type Quantity = z.infer<typeof zQuantity>;
export type QuantityAllowZero = z.infer<typeof zQuantityAllowZero>;
export type QuantityCanBeNegative = z.infer<typeof zQuantityCanBeNegative>;
export type Percent = z.infer<typeof zPercent>;
export type Weight = z.infer<typeof zWeight>;
export type Name = z.infer<typeof zName>;
