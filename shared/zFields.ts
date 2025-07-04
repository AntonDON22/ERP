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
export const zIdOptional = zId.optional();

/**
 * Схема для названий сущностей (документы, заказы, продукты)
 *
 * Стандартное поле названия с валидацией длины и обрезкой пробелов
 * Используется во всех сущностях системы для унификации правил
 */
export const zName = z
  .string()
  .trim()
  .min(1, "Название обязательно")
  .max(255, "Название не должно превышать 255 символов");

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
 * Статус отгрузки - только допустимые значения
 */
export const zShipmentStatus = z.enum(["draft", "shipped"], {
  errorMap: () => ({ message: "Статус отгрузки должен быть 'draft' или 'shipped'" }),
});

export const zShipmentStatusOptional = zShipmentStatus.optional();

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

// Все старые строковые схемы удалены - используйте централизованные поля выше

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

/**
 * Схема для имен пользователей
 */
export const zUsername = z
  .string()
  .trim()
  .min(1, "Имя пользователя обязательно")
  .max(50, "Имя пользователя не должно превышать 50 символов");

/**
 * Схема для паролей
 */
export const zPassword = z
  .string()
  .min(1, "Пароль обязателен")
  .min(4, "Пароль должен содержать минимум 4 символа");

/**
 * Схема для штрих-кодов
 */
export const zBarcode = z
  .string()
  .max(50, "Штрих-код не должен превышать 50 символов")
  .optional()
  .or(z.literal(""))
  .transform(val => val === "" ? undefined : val);

/**
 * Схема для URL изображений
 */
export const zImageUrl = z
  .string()
  .max(500, "URL изображения не должен превышать 500 символов")
  .optional()
  .or(z.literal(""))
  .transform(val => val === "" ? undefined : val);

/**
 * Схема для веб-сайтов
 */
export const zWebsite = z
  .string()
  .optional()
  .transform((val) => val?.trim() || undefined)
  .refine(
    (val) => !val || val === undefined || val.startsWith("http"),
    "Вебсайт должен начинаться с http или https"
  );



/**
 * Схема для адресов
 */
export const zAddress = z
  .string()
  .optional()
  .transform((val) => val?.trim() || undefined)
  .refine((val) => !val || val.length <= 500, "Адрес не должен превышать 500 символов");

/**
 * Схема для артикулов товаров (SKU)
 */
export const zSku = z
  .string()
  .trim()
  .min(1, "Артикул обязателен")
  .max(100, "Артикул не должен превышать 100 символов")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Артикул может содержать только буквы, цифры, дефисы и подчеркивания"
  );

/**
 * Схемы валидации массивов ID для множественного удаления отгрузок
 */
export const shipmentIdsSchema = z.object({
  ids: z.array(zId).min(1, "Необходимо выбрать хотя бы одну отгрузку для удаления"),
});
